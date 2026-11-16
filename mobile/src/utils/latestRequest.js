// Invalidate older work without relying on a transport supporting cancellation.
export const createLatestRequestRunner = () => {
  let revision = 0;

  return {
    invalidate() {
      revision += 1;
    },
    async run(request, { onSuccess, onError, onFinally }) {
      const current = ++revision;
      try {
        const result = await request();
        if (current === revision) onSuccess(result);
      } catch (error) {
        if (current === revision) onError(error);
      } finally {
        if (current === revision) onFinally();
      }
    }
  };
};
