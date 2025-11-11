require("jest-axe/extend-expect");
require("@testing-library/jest-dom");

// Suppress React Query background refetches and retries in tests
// This reduces "act" warnings from async updates
if (typeof jest !== 'undefined') {
  jest.mock("@tanstack/react-query", () => {
    const actual = jest.requireActual("@tanstack/react-query");
    return {
      ...actual,
      QueryClient: class extends actual.QueryClient {
        constructor(config) {
          super({
            ...config,
            defaultOptions: {
              ...config?.defaultOptions,
              queries: {
                ...config?.defaultOptions?.queries,
                retry: false,
                refetchOnWindowFocus: false,
                refetchOnMount: false,
                refetchOnReconnect: false,
                staleTime: Infinity,
                cacheTime: Infinity,
              },
              mutations: {
                ...config?.defaultOptions?.mutations,
                retry: false,
              },
            },
          });
        }
      },
    };
  });
}

// Polyfill window.getComputedStyle to support pseudo-elements
// This prevents jsdom "Not implemented" errors when axe-core checks styles
const originalGetComputedStyle = window.getComputedStyle;

window.getComputedStyle = function (elt, pseudoElt) {
  // If pseudoElt is provided, jsdom throws "Not implemented"
  // Return a minimal CSSStyleDeclaration-like object for axe's needs
  if (pseudoElt) {
    return {
      getPropertyValue: (prop) => {
        // Provide commonly requested properties by axe-core
        if (prop === "color") return "rgb(0, 0, 0)";
        if (prop === "background-color" || prop === "background") return "rgb(255, 255, 255)";
        if (prop === "font-size") return "16px";
        if (prop === "font-weight") return "400";
        if (prop === "line-height") return "1.5";
        // fallback
        return "";
      },
    };
  }
  // Fallback to original behaviour for non-pseudo elements
  return originalGetComputedStyle ? originalGetComputedStyle.call(window, elt) : {
    getPropertyValue: () => "",
  };
};

// Mock Next.js router
jest.mock("next/router", () => ({
  useRouter() {
    return {
      route: "/",
      pathname: "/",
      query: "",
      asPath: "",
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    };
  },
}));

// Mock API client
jest.mock("./src/lib/api", () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({ data: { data: [] } }),
    post: jest.fn().mockResolvedValue({ data: { data: {} } }),
    put: jest.fn().mockResolvedValue({ data: { data: {} } }),
    delete: jest.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock HTMLCanvasElement.getContext to prevent "Not implemented" error
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(),
  putImageData: jest.fn(),
  createImageData: jest.fn(),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  fillText: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  transform: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn(),
}));
