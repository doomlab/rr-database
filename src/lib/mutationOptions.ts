// Blitz's useMutation defaults to throwOnError, which re-throws a failed call
// into render (error overlay in dev, error boundary in prod) even when the
// caller has its own try/catch. Pass this for any mutation whose caller
// handles and displays its own errors.
export const NO_THROW = { throwOnError: false } as const
