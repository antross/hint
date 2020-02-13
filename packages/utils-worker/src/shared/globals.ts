// Include references to web worker globals to facilitate mocks during testing.
const _self: Pick<Window, 'addEventListener' | 'removeEventListener' | 'postMessage'> = self;

export { _self as self };
