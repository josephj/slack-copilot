export function triggerFetchThread(channel: string, threadTs: string) {
  window.postMessage(
    {
      type: 'FETCH_THREAD_DATA',
      payload: {
        channel,
        threadTs,
      },
    },
    '*',
  );
}
