# ink-testing-library `stdin.write()` 競合状態 調査メモ

## 概要

`pnpm test` が確率的に失敗する問題。`stdin.write()` を使ったキーボード入力テストが、
CI および一部のローカル実行で不安定だった。

関連 issue:
- [ink-testing-library #29](https://github.com/vadimdemedes/ink-testing-library/issues/29)
- [ink #625](https://github.com/vadimdemedes/ink/issues/625)
- [ink PR #616](https://github.com/vadimdemedes/ink/pull/616)

---

## 根本原因の分析

### Ink の入力パイプライン（PR #616 以降）

PR #616 によって Ink の stdin 処理が `data` イベントから `readable` イベントベースに変更された。

```
[実機 / 本番環境]
ユーザーがキー入力
  → process.stdin が 'readable' イベントを発火
  → Ink の handleReadable() が呼ばれる
      while ((chunk = stdin.read()) !== null) {
          internal_eventEmitter.emit('input', chunk);
      }
  → useInput() のコールバックが呼ばれる ✅
```

`useInput` フック ([ink/build/hooks/use-input.js](https://github.com/vadimdemedes/ink)) は
`internal_eventEmitter` の `'input'` イベントをリッスンする。
`internal_eventEmitter` への送出は `handleReadable` 経由でのみ行われる。

### `handleReadable` が登録されるタイミング

`handleReadable` が `stdin` の `'readable'` リスナーとして登録されるのは、
`useInput` 内の `useEffect` が `setRawMode(true)` を呼んだ時だけ：

```javascript
// ink/build/components/App.js (抜粋)
const handleSetRawMode = useCallback((isEnabled) => {
    if (isEnabled) {
        if (rawModeEnabledCount.current === 0) {
            stdin.ref();
            stdin.setRawMode(true);
            readableListenerRef.current = handleReadable;
            stdin.addListener('readable', handleReadable); // ← ここで初めて登録
        }
        rawModeEnabledCount.current++;
    }
}, [...]);
```

`setRawMode(true)` は `useEffect` の中から呼ばれる：

```javascript
// ink/build/hooks/use-input.js (抜粋)
useEffect(() => {
    if (options.isActive === false) return;
    setRawMode(true);  // ← React commit phase 完了後に非同期実行
    return () => setRawMode(false);
}, [options.isActive, setRawMode]);
```

### 競合状態の発生メカニズム

`useEffect` は React の commit phase 完了後に非同期で実行される。
つまり `render()` の直後に `stdin.write()` を呼ぶと、
`'readable'` リスナーがまだ登録されていない場合がある：

```
render(<App />)               // React ツリーを構築、commit phase はこれから
  ↓
stdin.write('c')              // 即時同期実行
  → this.emit('readable')    // リスナー未登録のため誰も受け取らない ❌
  ↓ (React が commit phase を完了)
useEffect 実行
  → setRawMode(true)
  → stdin.addListener('readable', handleReadable)  // 既に遅い
```

`await wait()` (10ms の setTimeout) を挟んでも、
環境の負荷やスケジューリングによって commit phase が間に合わないことがある。
これが確率的失敗の原因。

### ink-testing-library v4.0.0 の元の実装の問題点

```typescript
// ink-testing-library v4.0.0 の Stdin (元の実装)
class Stdin extends EventEmitter {
    data: string | null = null;  // ← 単一値: 連続 write() で上書きされる

    write = (data: string) => {
        this.data = data;
        this.emit('readable');  // ← リスナー未登録なら無視される
        this.emit('data', data);
    };

    read = () => {
        const { data } = this;
        this.data = null;
        return data;  // ← 上書きされた場合、古いデータは消える
    };
}
```

2つの問題がある：

1. **競合状態**: `write()` 時点で `'readable'` リスナーがまだ登録されていない
2. **データロスト**: `data` が単一値のため、連続した `write()` で前の値が上書きされる

---

## 今回の修正内容

`src/test-utils/ink-testing-library.ts` として ink-testing-library のローカルフォークを作成。

### 修正1: `data` をキュー (`#queue`) に変更

```typescript
// After
#queue: string[] = [];

read: () => string | null = () => {
    return this.#queue.shift() ?? null;  // FIFO で順番に返す
};
```

連続した `write()` が互いを上書きしなくなる。
Ink の `handleReadable` は `while ((chunk = stdin.read()) !== null)` でループするため、
キューに複数件あっても1回の `'readable'` イベントで全件処理できる。

### 修正2: `addListener('readable')` 時にキューをフラッシュ

```typescript
#rawModeEnabled = false;

write = (data: string) => {
    this.#queue.push(data);
    if (this.#rawModeEnabled) {
        this.emit("readable");  // リスナー登録済みなら即発火
    }
    this.emit("data", data);
};

override addListener(event, listener) {
    super.addListener(event, listener);
    if (event === "readable") {
        this.#rawModeEnabled = true;
        // 既にキューに積まれているデータをマイクロタスクで再フラッシュ
        const pending = this.#queue.length;
        for (let i = 0; i < pending; i++) {
            Promise.resolve().then(() => {
                if (this.#queue.length > 0) {
                    this.emit("readable");
                }
            });
        }
    }
    return this;
}
```

`Promise.resolve().then()` はマイクロタスクキューに積まれるため、
現在の同期処理（React の `useEffect` 登録処理）が完了した直後に実行される。
`setImmediate` より早く、かつ同期処理を妨げないタイミング。

---

## 解決しきれていない可能性のある問題点

今回の修正でもまだ稀に失敗する可能性が残っている理由を以下に列挙する。

### 問題点A: React の `batchedUpdates` との干渉

```javascript
// ink/build/hooks/use-input.js (抜粋)
reconciler.batchedUpdates(() => {
    inputHandler(input, key);
});
```

`inputHandler` (= `useInput` のコールバック) は `reconciler.batchedUpdates` でラップされている。
バッチ処理中に複数の state 更新がまとめられるため、
マイクロタスクのタイミングと React のスケジューラが干渉するケースが考えられる。

### 問題点B: `useEffect` の実行順序

複数の `useEffect` が存在する場合（`App.tsx` + `ManualOutputScreen.tsx` のそれぞれに `useInput` がある）、
どの `useEffect` から先に `setRawMode(true)` が呼ばれるかは保証されない。
最初の `addListener` 呼び出し時にのみキューをフラッシュするが、
2番目の `addListener` が来た時にはキューが空になっている可能性がある
（1番目の `handleReadable` が既にキューを消費済みのため）。
これは正しい動作だが、テストの期待とズレる場合がある。

### 問題点C: マイクロタスクの実行順序保証

`Promise.resolve().then()` は現在の同期タスクの直後に実行されるが、
React 19 の Concurrent Mode では React のスケジューラ自体がマイクロタスクを使う可能性があり、
実行順序が意図通りにならないケースがあるかもしれない。

### 問題点D: `on` vs `addListener`

`EventEmitter.on` は `addListener` のエイリアスだが、
`override addListener` が `on` 経由の呼び出しでも正しく動くかは
Node.js の実装依存。`on` も合わせて override が必要な可能性がある。

---

## 今後再修正を試みる場合の指針

### アプローチ1: `on` も override する（難易度: 低）

```typescript
override on(event: string, listener: (...args: unknown[]) => void): this {
    return this.addListener(event, listener);
}
```

`addListener` と `on` が別経路で呼ばれている可能性を排除する。

### アプローチ2: `setRawMode` を hook として使う（難易度: 中）

ink-testing-library の `Stdin.setRawMode()` が呼ばれた時点でキューをフラッシュする：

```typescript
setRawMode(enabled: boolean) {
    if (enabled && this.#queue.length > 0) {
        // setRawMode(true) = addListener の直前に呼ばれる
        // この時点でフラッシュすれば確実
        Promise.resolve().then(() => this.emit("readable"));
    }
}
```

Ink の `handleSetRawMode` は `addListener` の直前に `setRawMode(true)` を呼ぶので、
そこでフラッシュをトリガーする方が正確。

### アプローチ3: `handleReadable` を直接呼ぶ（難易度: 中）

`addListener` 時にリスナーを直接呼ぶ：

```typescript
override addListener(event, listener) {
    super.addListener(event, listener);
    if (event === "readable" && this.#queue.length > 0) {
        // リスナーを直接・同期的に呼び出す
        (listener as () => void)();
    }
}
```

マイクロタスクを介さず同期的に呼ぶため、タイミング問題が起きない。
ただし `listener` が `handleReadable` 以外のリスナーである場合に副作用が出るかもしれない。

### アプローチ4: テスト設計を変える（難易度: 高、最も確実）

`stdin.write()` に依存するテストを廃止し、入力ハンドラロジックを純粋関数として抽出してテストする。
issue #29 で提案されているワークアラウンドと同じ方向性。

```typescript
// コンポーネントから入力処理を切り出す
export function createNavigationHandler(
    screen: Screen,
    setScreen: (s: Screen) => void,
    setDisplayMode: (m: DisplayMode) => void,
    exit: () => void,
) {
    return (input: string) => {
        if (input === 'q' || input === 'Q') exit();
        if (input === 'm' || input === 'M') setScreen('main');
        // ...
    };
}

// テストでは純粋関数として直接テスト
it('should navigate to config on c key', () => {
    const setScreen = vi.fn();
    const handler = createNavigationHandler('main', setScreen, vi.fn(), vi.fn());
    handler('c');
    expect(setScreen).toHaveBeenCalledWith('config');
});
```

この方法では `stdin.write()` も `useEffect` のタイミングも関係ないため、根本的に安定する。

---

## 環境情報

```
ink: ^6.7.0
ink-testing-library: ^4.0.0  (テストでは src/test-utils/ink-testing-library.ts を使用)
react: ^19.2.4
vitest: ^4.0.18
Node.js: >=22 <24
```
