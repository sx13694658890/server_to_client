/**
 * 将 SSE 推送的全文缓冲，按固定节奏逐段「露出」到界面，避免整段瞬间画完。
 */
export type StreamTextReveal = {
  pushDelta: (text: string) => void;
  /** 流结束时的权威全文；在界面追上 target 后调用 onDrained */
  finalize: (fullText: string, onDrained: () => void) => void;
  cancel: () => void;
  getTarget: () => string;
};

export function createStreamTextReveal(options: {
  intervalMs?: number;
  onFlush: (visible: string) => void;
}): StreamTextReveal {
  let target = '';
  let displayed = '';
  let timer: ReturnType<typeof setInterval> | null = null;
  let drainCallback: (() => void) | null = null;
  let finalized = false;

  const intervalMs = Math.max(20, options.intervalMs ?? 68);

  const stopTimer = () => {
    if (timer != null) {
      clearInterval(timer);
      timer = null;
    }
  };

  /** 积压多时一次多吐几个字，避免永远追不上；接近结尾时每次 1～2 字更有「蹦」感 */
  const stepSize = () => {
    const behind = target.length - displayed.length;
    if (behind <= 0) return 0;
    if (behind > 200) return 10;
    if (behind > 100) return 6;
    if (behind > 50) return 4;
    if (behind > 20) return 2;
    return 1;
  };

  const tick = () => {
    const n = stepSize();
    if (n > 0) {
      displayed = target.slice(0, displayed.length + n);
      options.onFlush(displayed);
    }

    if (displayed.length >= target.length && finalized && drainCallback) {
      stopTimer();
      const cb = drainCallback;
      drainCallback = null;
      cb();
    }
  };

  const startTimer = () => {
    if (timer != null) return;
    timer = setInterval(tick, intervalMs);
    queueMicrotask(tick);
  };

  return {
    getTarget: () => target,

    pushDelta(text: string) {
      if (finalized) return;
      target += text;
      startTimer();
    },

    finalize(fullText: string, onDrained: () => void) {
      finalized = true;
      target = fullText;
      drainCallback = onDrained;
      startTimer();
    },

    cancel() {
      stopTimer();
      drainCallback = null;
      finalized = true;
    },
  };
}

function streamTickMsFromEnv(): number {
  const raw = import.meta.env.VITE_AI_CHAT_STREAM_TICK_MS;
  if (raw === undefined || raw === '') return 68;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 20 ? n : 68;
}

export function createStreamTextRevealFromEnv(onFlush: (visible: string) => void): StreamTextReveal {
  return createStreamTextReveal({
    intervalMs: streamTickMsFromEnv(),
    onFlush,
  });
}
