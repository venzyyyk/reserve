// Stand-in for the `server-only` package inside Vitest. The real module
// throws to stop server code reaching a client bundle; tests import server
// modules deliberately, so here it does nothing.
export {};
