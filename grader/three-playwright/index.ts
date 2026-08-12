import type { Page } from "@playwright/test";
import type { Camera, Scene, WebGLRenderer } from "three";

export class ThreewrightError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ThreewrightError";
  }
}

export class ThreewrightInjectionError extends ThreewrightError {
  constructor(options?: ErrorOptions) {
    super("Unable to install the Threewright browser runtime.", options);
    this.name = "ThreewrightInjectionError";
  }
}

export class ThreewrightRuntimeNotReadyError extends ThreewrightError {
  constructor(options?: ErrorOptions) {
    super("Threewright could not find a completed Three.js render.", options);
    this.name = "ThreewrightRuntimeNotReadyError";
  }
}

export interface ThreeContext {
  camera: Camera;
  renderer: WebGLRenderer;
  scene: Scene;
}

export interface ThreeSelector<Argument, Result> {
  (context: ThreeContext, argument: Argument): Result | Promise<Result>;
}

export interface Three {
  <Argument = void, Result = unknown>(
    selector: ThreeSelector<Argument, Result>,
    argument?: Argument,
  ): Promise<Result>;
}

interface ThreeRenderContext {
  camera: Camera;
  renderer: WebGLRenderer;
  scene: Scene;
}

interface ThreeRuntimeState {
  camera?: Camera;
  cameras: Camera[];
  contexts: ThreeRenderContext[];
  kind: string;
  renderer?: WebGLRenderer;
  renderers: WebGLRenderer[];
  revision?: string;
  revisions: string[];
  scene?: Scene;
  scenes: Scene[];
}

declare global {
  var __THREEWRIGHT__: ThreeRuntimeState | undefined;
  var __THREE_DEVTOOLS__: EventTarget | undefined;
}

/** This function is serialized by Playwright and runs before application JS. */
const installThreewrightRuntime = (): void => {
  interface RuntimeCamera {
    isCamera: true;
  }

  interface RuntimeScene {
    isScene: true;
  }

  interface RuntimeRenderer {
    getRenderTarget?: () => unknown;
    render: (scene: RuntimeScene, camera: RuntimeCamera) => unknown;
    setPixelRatio: (...arguments_: unknown[]) => unknown;
  }

  interface RuntimeRenderContext {
    camera: RuntimeCamera;
    renderer: RuntimeRenderer;
    scene: RuntimeScene;
  }

  interface RuntimeState {
    camera?: RuntimeCamera;
    cameras: RuntimeCamera[];
    contexts: RuntimeRenderContext[];
    kind: string;
    renderer?: RuntimeRenderer;
    renderers: RuntimeRenderer[];
    revision?: string;
    revisions: string[];
    scene?: RuntimeScene;
    scenes: RuntimeScene[];
  }

  const runtimeKind = "threewright";
  const installedState: unknown = Reflect.get(globalThis, "__THREEWRIGHT__");
  if (
    typeof installedState === "object" &&
    installedState !== null &&
    Reflect.get(installedState, "kind") === runtimeKind
  ) {
    return;
  }

  const isCamera = (value: unknown): value is RuntimeCamera =>
    typeof value === "object" && value !== null && Reflect.get(value, "isCamera") === true;
  const isScene = (value: unknown): value is RuntimeScene =>
    typeof value === "object" && value !== null && Reflect.get(value, "isScene") === true;
  const isRenderer = (value: unknown): value is RuntimeRenderer =>
    typeof value === "object" &&
    value !== null &&
    typeof Reflect.get(value, "render") === "function" &&
    typeof Reflect.get(value, "setPixelRatio") === "function";
  const isEventTarget = (value: unknown): value is EventTarget =>
    typeof value === "object" &&
    value !== null &&
    typeof Reflect.get(value, "addEventListener") === "function" &&
    typeof Reflect.get(value, "dispatchEvent") === "function";

  const addUniqueObject = <Value extends object>(
    values: Value[],
    observedValues: WeakSet<Value>,
    value: Value,
  ): void => {
    if (observedValues.has(value)) return;
    observedValues.add(value);
    values.push(value);
  };

  const state: RuntimeState = {
    cameras: [],
    contexts: [],
    kind: runtimeKind,
    renderers: [],
    revisions: [],
    scenes: [],
  };
  const observedCameras = new WeakSet<RuntimeCamera>();
  const observedRenderers = new WeakSet<RuntimeRenderer>();
  const observedScenes = new WeakSet<RuntimeScene>();
  const wrappedRenderers = new WeakSet<RuntimeRenderer>();
  const handledEvents = new WeakSet<Event>();

  const captureRender = (
    renderer: RuntimeRenderer,
    scene: RuntimeScene,
    camera: RuntimeCamera,
    renderTarget: unknown,
  ): void => {
    addUniqueObject(state.cameras, observedCameras, camera);
    addUniqueObject(state.renderers, observedRenderers, renderer);
    addUniqueObject(state.scenes, observedScenes, scene);

    const hasContext = state.contexts.some(
      (context) =>
        context.camera === camera && context.renderer === renderer && context.scene === scene,
    );
    if (!hasContext) state.contexts.push({ camera, renderer, scene });

    if (state.camera && renderTarget !== null && renderTarget !== undefined) return;
    state.camera = camera;
    state.renderer = renderer;
    state.scene = scene;
  };

  const wrapRenderer = (renderer: RuntimeRenderer): void => {
    if (wrappedRenderers.has(renderer)) return;
    const render = renderer.render;
    try {
      renderer.render = new Proxy(render, {
        apply(target, thisArgument, argumentsList) {
          const [scene, camera] = argumentsList;
          let renderTarget: unknown;
          try {
            renderTarget = renderer.getRenderTarget?.();
          } catch {
            renderTarget = undefined;
          }
          const result = Reflect.apply(target, thisArgument, argumentsList);
          if (isScene(scene) && isCamera(camera)) {
            captureRender(renderer, scene, camera, renderTarget);
          }
          return result;
        },
      });
      wrappedRenderers.add(renderer);
    } catch {
      return;
    }
  };

  const observe = (value: unknown): void => {
    if (isScene(value)) addUniqueObject(state.scenes, observedScenes, value);
    if (isCamera(value)) addUniqueObject(state.cameras, observedCameras, value);
    if (!isRenderer(value)) return;
    addUniqueObject(state.renderers, observedRenderers, value);
    wrapRenderer(value);
  };

  const register = (value: unknown): void => {
    if (typeof value !== "object" || value === null) return;
    const revision: unknown = Reflect.get(value, "revision");
    if (typeof revision !== "string" && typeof revision !== "number") return;
    const normalizedRevision = String(revision);
    if (!state.revisions.includes(normalizedRevision)) state.revisions.push(normalizedRevision);
    state.revision = normalizedRevision;
  };

  const handleHookEvent = (event: Event): void => {
    if (handledEvents.has(event)) return;
    handledEvents.add(event);
    const detail: unknown = Reflect.get(event, "detail");
    if (event.type === "observe") observe(detail);
    if (event.type === "register") register(detail);
  };

  const existingHook: unknown = Reflect.get(globalThis, "__THREE_DEVTOOLS__");
  const hook = isEventTarget(existingHook) ? existingHook : new EventTarget();
  hook.addEventListener("observe", handleHookEvent);
  hook.addEventListener("register", handleHookEvent);

  if (hook === existingHook) {
    const dispatchEvent = hook.dispatchEvent;
    try {
      hook.dispatchEvent = new Proxy(dispatchEvent, {
        apply(target, thisArgument, argumentsList) {
          const [event] = argumentsList;
          if (event instanceof Event) handleHookEvent(event);
          return Reflect.apply(target, thisArgument, argumentsList);
        },
      });
    } catch {
      // The existing hook can still deliver events through its listener.
    }
  } else {
    Object.defineProperty(globalThis, "__THREE_DEVTOOLS__", {
      configurable: true,
      enumerable: true,
      value: hook,
      writable: true,
    });
  }

  Object.defineProperty(globalThis, "__THREEWRIGHT__", {
    configurable: false,
    enumerable: false,
    value: state,
    writable: false,
  });
};

export const attachThree = async (page: Page): Promise<Three> => {
  try {
    await page.addInitScript(installThreewrightRuntime);
  } catch (error) {
    throw new ThreewrightInjectionError({ cause: error });
  }

  return async <Argument = void, Result = unknown>(
    selector: ThreeSelector<Argument, Result>,
    argument?: Argument,
  ): Promise<Result> => {
    try {
      const ready = await page.waitForFunction(() => {
        const state = globalThis.__THREEWRIGHT__;
        return Boolean(state?.camera && state.renderer && state.scene);
      });
      await ready.dispose();
    } catch (error) {
      throw new ThreewrightRuntimeNotReadyError({ cause: error });
    }

    const context = await page.evaluateHandle(() => {
      const state = globalThis.__THREEWRIGHT__;
      if (!state?.camera || !state.renderer || !state.scene) return;
      return {
        camera: state.camera,
        renderer: state.renderer,
        scene: state.scene,
      };
    });

    try {
      const contextIsReady = await context.evaluate((value) => value !== undefined);
      if (!contextIsReady) throw new ThreewrightRuntimeNotReadyError();
      return await context.evaluate<Result, Argument>(selector as never, argument as Argument);
    } finally {
      await context.dispose();
    }
  };
};
