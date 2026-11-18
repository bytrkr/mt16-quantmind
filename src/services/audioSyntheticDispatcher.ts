const noop = () => true;
export const audioSyntheticDispatcher: any = new Proxy({}, { get: (_t, prop) => prop === 'isMuted' ? () => true : noop });
export default audioSyntheticDispatcher;
