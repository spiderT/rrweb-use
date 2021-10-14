# 前端页面录制与回放

用rrweb：https://github.com/rrweb-io/rrweb 进行页面录制与回放

```text
git clone https://github.com/spiderT/rrweb-use.git
cd rrweb-use
npm i
npm start

# 打开： http://localhost:9000/#/  
```

> demo功能

1. 页面录制与回放：用indexedDB 存储用户操作，然后列表展示收集数据进行回放。
   
   ✅手动录制  
   ✅自动录制  
   ✅录制error发生前的事件  

2. 基于rrweb 提供的API的一些处理

   ✅优化存储容量: https://github.com/rrweb-io/rrweb/blob/master/docs/recipes/optimize-storage.zh_CN.md  
   ✅console 录制和播放: https://github.com/rrweb-io/rrweb/blob/master/docs/recipes/console.zh_CN.md  
   回放时与 UI 交互: https://github.com/rrweb-io/rrweb/blob/master/docs/recipes/interaction.zh_CN.md  


> 源码学习, 版本：1.0.5

- [前端页面录制与回放](#前端页面录制与回放)
  - [1. rrweb-snapshot](#1-rrweb-snapshot)
    - [1.1. snapshot](#11-snapshot)
    - [1.2. rebuild](#12-rebuild)
  - [2. rrweb](#2-rrweb)
    - [2.1. record](#21-record)
  - [3. rrweb-player](#3-rrweb-player)

rrweb 主要由 3 部分组成：

- rrweb-snapshot，包含 snapshot 和 rebuild 两个功能。snapshot 用于将 DOM 及其状态转化为可序列化的数据结构并添加唯一标识；rebuild 则是将 snapshot 记录的数据结构重建为对应的 DOM。  

- rrweb，包含 record 和 replay 两个功能。record 用于记录 DOM 中的所有变更（mutation）；replay 则是将记录的变更按照对应的时间一一重放。  

- rrweb-player，为 rrweb 提供一套 UI 控件，提供基于 GUI 的暂停、快进、拖拽至任意时间点播放等功能。  

## 1. rrweb-snapshot

### 1.1. snapshot

snapshot 用于将 DOM 及其状态转化为可序列化的数据结构并添加唯一标识。

源码位置：packages/rrweb-snapshot/src/snapshot.ts

serializeNode 针对不同的nodeType进行序列化处理

```ts
function serializeNode(
  n: Node,
  options: {
    doc: Document;
    blockClass: string | RegExp;
    blockSelector: string | null;
    maskTextClass: string | RegExp;
    maskTextSelector: string | null;
    inlineStylesheet: boolean;
    maskInputOptions: MaskInputOptions;
    maskTextFn: MaskTextFn | undefined;
    maskInputFn: MaskInputFn | undefined;
    recordCanvas: boolean;
    keepIframeSrcFn: KeepIframeSrcFn;
  },
): serializedNode | false {
  const {
    doc,
    blockClass,
    blockSelector,
    maskTextClass,
    maskTextSelector,
    inlineStylesheet,
    maskInputOptions = {},
    maskTextFn,
    maskInputFn,
    recordCanvas,
    keepIframeSrcFn,
  } = options;
  // Only record root id when document object is not the base document
  let rootId: number | undefined;
  if (((doc as unknown) as INode).__sn) {
    const docId = ((doc as unknown) as INode).__sn.id;
    rootId = docId === 1 ? undefined : docId;
  }
  switch (n.nodeType) {
    case n.DOCUMENT_NODE:
      if ((n as HTMLDocument).compatMode !== 'CSS1Compat') {
        return {
          type: NodeType.Document,
          childNodes: [],
          compatMode: (n as HTMLDocument).compatMode,  // probably "BackCompat"
          rootId,
        }
      } else {
        return {
          type: NodeType.Document,
          childNodes: [],
          rootId,
        }
      }
    case n.DOCUMENT_TYPE_NODE:
      return {
        type: NodeType.DocumentType,
        name: (n as DocumentType).name,
        publicId: (n as DocumentType).publicId,
        systemId: (n as DocumentType).systemId,
        rootId,
      };
    case n.ELEMENT_NODE:
      const needBlock = _isBlockedElement(
        n as HTMLElement,
        blockClass,
        blockSelector,
      );
      const tagName = getValidTagName(n as HTMLElement);
      let attributes: attributes = {};
      for (const { name, value } of Array.from((n as HTMLElement).attributes)) {
        attributes[name] = transformAttribute(doc, tagName, name, value);
      }
      // remote css
      if (tagName === 'link' && inlineStylesheet) {
        const stylesheet = Array.from(doc.styleSheets).find((s) => {
          return s.href === (n as HTMLLinkElement).href;
        });
        const cssText = getCssRulesString(stylesheet as CSSStyleSheet);
        if (cssText) {
          delete attributes.rel;
          delete attributes.href;
          attributes._cssText = absoluteToStylesheet(
            cssText,
            stylesheet!.href!,
          );
        }
      }
      // dynamic stylesheet
      if (
        tagName === 'style' &&
        (n as HTMLStyleElement).sheet &&
        // TODO: Currently we only try to get dynamic stylesheet when it is an empty style element
        !(
          (n as HTMLElement).innerText ||
          (n as HTMLElement).textContent ||
          ''
        ).trim().length
      ) {
        const cssText = getCssRulesString(
          (n as HTMLStyleElement).sheet as CSSStyleSheet,
        );
        if (cssText) {
          attributes._cssText = absoluteToStylesheet(cssText, getHref());
        }
      }
      // form fields
      if (
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select'
      ) {
        const value = (n as HTMLInputElement | HTMLTextAreaElement).value;
        if (
          attributes.type !== 'radio' &&
          attributes.type !== 'checkbox' &&
          attributes.type !== 'submit' &&
          attributes.type !== 'button' &&
          value
        ) {
          attributes.value = maskInputValue({
            type: attributes.type,
            tagName,
            value,
            maskInputOptions,
            maskInputFn,
          });
        } else if ((n as HTMLInputElement).checked) {
          attributes.checked = (n as HTMLInputElement).checked;
        }
      }
      if (tagName === 'option') {
        if ((n as HTMLOptionElement).selected) {
          attributes.selected = true;
        } else {
          // ignore the html attribute (which corresponds to DOM (n as HTMLOptionElement).defaultSelected)
          // if it's already been changed
          delete attributes.selected;
        }
      }
      // canvas image data
      if (tagName === 'canvas' && recordCanvas) {
        attributes.rr_dataURL = (n as HTMLCanvasElement).toDataURL();
      }
      // media elements
      if (tagName === 'audio' || tagName === 'video') {
        attributes.rr_mediaState = (n as HTMLMediaElement).paused
          ? 'paused'
          : 'played';
        attributes.rr_mediaCurrentTime = (n as HTMLMediaElement).currentTime;
      }
      // scroll
      if ((n as HTMLElement).scrollLeft) {
        attributes.rr_scrollLeft = (n as HTMLElement).scrollLeft;
      }
      if ((n as HTMLElement).scrollTop) {
        attributes.rr_scrollTop = (n as HTMLElement).scrollTop;
      }
      // block element
      if (needBlock) {
        const { width, height } = (n as HTMLElement).getBoundingClientRect();
        attributes = {
          class: attributes.class,
          rr_width: `${width}px`,
          rr_height: `${height}px`,
        };
      }
      // iframe
      if (tagName === 'iframe' && !keepIframeSrcFn(attributes.src as string)) {
        delete attributes.src;
      }
      return {
        type: NodeType.Element,
        tagName,
        attributes,
        childNodes: [],
        isSVG: isSVGElement(n as Element) || undefined,
        needBlock,
        rootId,
      };
    case n.TEXT_NODE:
      // The parent node may not be a html element which has a tagName attribute.
      // So just let it be undefined which is ok in this use case.
      const parentTagName =
        n.parentNode && (n.parentNode as HTMLElement).tagName;
      let textContent = (n as Text).textContent;
      const isStyle = parentTagName === 'STYLE' ? true : undefined;
      const isScript = parentTagName === 'SCRIPT' ? true : undefined;
      if (isStyle && textContent) {
        textContent = absoluteToStylesheet(textContent, getHref());
      }
      if (isScript) {
        textContent = 'SCRIPT_PLACEHOLDER';
      }
      if (
        !isStyle &&
        !isScript &&
        needMaskingText(n, maskTextClass, maskTextSelector) &&
        textContent
      ) {
        textContent = maskTextFn
          ? maskTextFn(textContent)
          : textContent.replace(/[\S]/g, '*');
      }
      return {
        type: NodeType.Text,
        textContent: textContent || '',
        isStyle,
        rootId,
      };
    case n.CDATA_SECTION_NODE:
      return {
        type: NodeType.CDATA,
        textContent: '',
        rootId,
      };
    case n.COMMENT_NODE:
      return {
        type: NodeType.Comment,
        textContent: (n as Comment).textContent || '',
        rootId,
      };
    default:
      return false;
  }
}
```



### 1.2. rebuild

## 2. rrweb

###  2.1. record

record： 用于记录 DOM 中的所有变更（mutation），包括初始时的一次全量DOM序列化，以及后续的增量变更。

API使用方法: 

```js
rrweb.record({
   emit(event) {
      events.current.push(event);
   },
   packFn: pack,
});
```

源码位置：packages/rrweb/src/record

record函数将近400行, takeFullSnapshot 用于记录全量DOM; observe 会监听页面各种事件来记录增量变更，这个下面再说。

```ts
function record<T = eventWithTime>(
  options: recordOptions<T> = {},
): listenerHandler | undefined {
  const {
    emit,
    checkoutEveryNms,
    checkoutEveryNth,
    blockClass = 'rr-block',
    blockSelector = null,
    ignoreClass = 'rr-ignore',
    maskTextClass = 'rr-mask',
    maskTextSelector = null,
    inlineStylesheet = true,
    maskAllInputs,
    maskInputOptions: _maskInputOptions,
    slimDOMOptions: _slimDOMOptions,
    maskInputFn,
    maskTextFn,
    hooks,
    packFn,
    sampling = {},
    mousemoveWait,
    recordCanvas = false,
    userTriggeredOnInput = false,
    collectFonts = false,
    plugins,
    keepIframeSrcFn = () => false,
  } = options;
  // runtime checks for user options
  if (!emit) {
    throw new Error('emit function is required');
  }
  // move departed options to new options
  if (mousemoveWait !== undefined && sampling.mousemove === undefined) {
    sampling.mousemove = mousemoveWait;
  }
  
  ...

  polyfill();

  let lastFullSnapshotEvent: eventWithTime;
  let incrementalSnapshotCount = 0;
  wrappedEmit = (e: eventWithTime, isCheckout?: boolean) => {
    if (
      mutationBuffers[0]?.isFrozen() &&
      e.type !== EventType.FullSnapshot &&
      !(
        e.type === EventType.IncrementalSnapshot &&
        e.data.source === IncrementalSource.Mutation
      )
    ) {
      // we've got a user initiated event so first we need to apply
      // all DOM changes that have been buffering during paused state
      mutationBuffers.forEach((buf) => buf.unfreeze());
    }

    emit(((packFn ? packFn(e) : e) as unknown) as T, isCheckout);
    if (e.type === EventType.FullSnapshot) {
      lastFullSnapshotEvent = e;
      incrementalSnapshotCount = 0;
    } else if (e.type === EventType.IncrementalSnapshot) {
      // attach iframe should be considered as full snapshot
      if (
        e.data.source === IncrementalSource.Mutation &&
        e.data.isAttachIframe
      ) {
        return;
      }

      incrementalSnapshotCount++;
      const exceedCount =
        checkoutEveryNth && incrementalSnapshotCount >= checkoutEveryNth;
      const exceedTime =
        checkoutEveryNms &&
        e.timestamp - lastFullSnapshotEvent.timestamp > checkoutEveryNms;
      if (exceedCount || exceedTime) {
        takeFullSnapshot(true);
      }
    }
  };

  const wrappedMutationEmit = (m: mutationCallbackParam) => {
    wrappedEmit(
      wrapEvent({
        type: EventType.IncrementalSnapshot,
        data: {
          source: IncrementalSource.Mutation,
          ...m,
        },
      }),
    );
  };
  const wrappedScrollEmit: scrollCallback = (p) =>
    wrappedEmit(
      wrapEvent({
        type: EventType.IncrementalSnapshot,
        data: {
          source: IncrementalSource.Scroll,
          ...p,
        },
      }),
    );

  const iframeManager = new IframeManager({
    mutationCb: wrappedMutationEmit,
  });

  const shadowDomManager = new ShadowDomManager({
    mutationCb: wrappedMutationEmit,
    scrollCb: wrappedScrollEmit,
    bypassOptions: {
      blockClass,
      blockSelector,
      maskTextClass,
      maskTextSelector,
      inlineStylesheet,
      maskInputOptions,
      maskTextFn,
      maskInputFn,
      recordCanvas,
      sampling,
      slimDOMOptions,
      iframeManager,
    },
    mirror,
  });

  // 全量DOM序列化
  takeFullSnapshot = (isCheckout = false) => {
    ...
  };

  try {
    const handlers: listenerHandler[] = [];
    handlers.push(
      on('DOMContentLoaded', () => {
        wrappedEmit(
          wrapEvent({
            type: EventType.DomContentLoaded,
            data: {},
          }),
        );
      }),
    );

    const observe = (doc: Document) => {
      ...
    };

    iframeManager.addLoadListener((iframeEl) => {
      handlers.push(observe(iframeEl.contentDocument!));
    });

    const init = () => {
      takeFullSnapshot();
      handlers.push(observe(document));
    };
    if (
      document.readyState === 'interactive' ||
      document.readyState === 'complete'
    ) {
      init();
    } else {
      handlers.push(
        on(
          'load',
          () => {
            wrappedEmit(
              wrapEvent({
                type: EventType.Load,
                data: {},
              }),
            );
            init();
          },
          window,
        ),
      );
    }
    return () => {
      handlers.forEach((h) => h());
    };
  } catch (error) {
    // TODO: handle internal error
    console.warn(error);
  }
}
```

takeFullSnapshot，内部利用rrweb-snapshot来序列化DOM

```ts
takeFullSnapshot = (isCheckout = false) => {
   wrappedEmit(
   wrapEvent({
      type: EventType.Meta,
      data: {
         href: window.location.href,
         width: getWindowWidth(),
         height: getWindowHeight(),
      },
   }),
   isCheckout,
   );

   mutationBuffers.forEach((buf) => buf.lock()); // don't allow any mirror modifications during snapshotting
   const [node, idNodeMap] = snapshot(document, {
   blockClass,
   blockSelector,
   maskTextClass,
   maskTextSelector,
   inlineStylesheet,
   maskAllInputs: maskInputOptions,
   maskTextFn,
   slimDOM: slimDOMOptions,
   recordCanvas,
   onSerialize: (n) => {
      if (isIframeINode(n)) {
         iframeManager.addIframe(n);
      }
      if (hasShadowRoot(n)) {
         shadowDomManager.addShadowRoot(n.shadowRoot, document);
      }
   },
   onIframeLoad: (iframe, childSn) => {
      iframeManager.attachIframe(iframe, childSn);
   },
   keepIframeSrcFn,
   });

   if (!node) {
   return console.warn('Failed to snapshot the document');
   }

   mirror.map = idNodeMap;
   wrappedEmit(
   wrapEvent({
      type: EventType.FullSnapshot,
      data: {
         node,
         initialOffset: {
         left:
            window.pageXOffset !== undefined
               ? window.pageXOffset
               : document?.documentElement.scrollLeft ||
               document?.body?.parentElement?.scrollLeft ||
               document?.body.scrollLeft ||
               0,
         top:
            window.pageYOffset !== undefined
               ? window.pageYOffset
               : document?.documentElement.scrollTop ||
               document?.body?.parentElement?.scrollTop ||
               document?.body.scrollTop ||
               0,
         },
      },
   }),
   );
   mutationBuffers.forEach((buf) => buf.unlock()); // generate & emit any mutations that happened during snapshotting, as can now apply against the newly built mirror
};
```

observe里面调用了initObservers方法，设置各种事件监听，每种事件触发时都会对应一个增量记录。

```ts
const observe = (doc: Document) => {
   return initObservers(
      {
         mutationCb: wrappedMutationEmit,
         mousemoveCb: (positions, source) =>
         wrappedEmit(
            wrapEvent({
               type: EventType.IncrementalSnapshot,
               data: {
               source,
               positions,
               },
            }),
         ),
         mouseInteractionCb: (d) =>
         wrappedEmit(
            wrapEvent({
               type: EventType.IncrementalSnapshot,
               data: {
               source: IncrementalSource.MouseInteraction,
               ...d,
               },
            }),
         ),
         scrollCb: wrappedScrollEmit,
         viewportResizeCb: (d) =>
         wrappedEmit(
            wrapEvent({
               type: EventType.IncrementalSnapshot,
               data: {
               source: IncrementalSource.ViewportResize,
               ...d,
               },
            }),
         ),
         inputCb: (v) =>
         wrappedEmit(
            wrapEvent({
               type: EventType.IncrementalSnapshot,
               data: {
               source: IncrementalSource.Input,
               ...v,
               },
            }),
         ),
         mediaInteractionCb: (p) =>
         wrappedEmit(
            wrapEvent({
               type: EventType.IncrementalSnapshot,
               data: {
               source: IncrementalSource.MediaInteraction,
               ...p,
               },
            }),
         ),
         styleSheetRuleCb: (r) =>
         wrappedEmit(
            wrapEvent({
               type: EventType.IncrementalSnapshot,
               data: {
               source: IncrementalSource.StyleSheetRule,
               ...r,
               },
            }),
         ),
         styleDeclarationCb: (r) =>
         wrappedEmit(
            wrapEvent({
               type: EventType.IncrementalSnapshot,
               data: {
               source: IncrementalSource.StyleDeclaration,
               ...r,
               },
            }),
         ),
         canvasMutationCb: (p) =>
         wrappedEmit(
            wrapEvent({
               type: EventType.IncrementalSnapshot,
               data: {
               source: IncrementalSource.CanvasMutation,
               ...p,
               },
            }),
         ),
         fontCb: (p) =>
         wrappedEmit(
            wrapEvent({
               type: EventType.IncrementalSnapshot,
               data: {
               source: IncrementalSource.Font,
               ...p,
               },
            }),
         ),
         blockClass,
         ignoreClass,
         maskTextClass,
         maskTextSelector,
         maskInputOptions,
         inlineStylesheet,
         sampling,
         recordCanvas,
         userTriggeredOnInput,
         collectFonts,
         doc,
         maskInputFn,
         maskTextFn,
         blockSelector,
         slimDOMOptions,
         mirror,
         iframeManager,
         shadowDomManager,
         plugins:
         plugins?.map((p) => ({
            observer: p.observer,
            options: p.options,
            callback: (payload: object) =>
               wrappedEmit(
               wrapEvent({
                  type: EventType.Plugin,
                  data: {
                     plugin: p.name,
                     payload,
                  },
               }),
               ),
         })) || [],
      },
      hooks,
   );
};
```

initObservers, 里面关于各种操作的observe方法在 packages/rrweb/src/record/observer.ts  

initMutationObserver利用MutaionObserver记录DOM变更，在MutationBuffer里处理MutationObserver的批量异步回调机制和增量变更之间的冲突。

```ts
function initObservers(
  o: observerParam,
  hooks: hooksParam = {},
): listenerHandler {
  const currentWindow = o.doc.defaultView; // basically document.window
  if (!currentWindow) {
    return () => {};
  }

  mergeHooks(o, hooks);
  const mutationObserver = initMutationObserver(
    o.mutationCb,
    o.doc,
    o.blockClass,
    o.blockSelector,
    o.maskTextClass,
    o.maskTextSelector,
    o.inlineStylesheet,
    o.maskInputOptions,
    o.maskTextFn,
    o.maskInputFn,
    o.recordCanvas,
    o.slimDOMOptions,
    o.mirror,
    o.iframeManager,
    o.shadowDomManager,
    o.doc,
  );
  const mousemoveHandler = initMoveObserver(
    o.mousemoveCb,
    o.sampling,
    o.doc,
    o.mirror,
  );
  const mouseInteractionHandler = initMouseInteractionObserver(
    o.mouseInteractionCb,
    o.doc,
    o.mirror,
    o.blockClass,
    o.sampling,
  );
  const scrollHandler = initScrollObserver(
    o.scrollCb,
    o.doc,
    o.mirror,
    o.blockClass,
    o.sampling,
  );
  const viewportResizeHandler = initViewportResizeObserver(o.viewportResizeCb);
  const inputHandler = initInputObserver(
    o.inputCb,
    o.doc,
    o.mirror,
    o.blockClass,
    o.ignoreClass,
    o.maskInputOptions,
    o.maskInputFn,
    o.sampling,
    o.userTriggeredOnInput,
  );
  const mediaInteractionHandler = initMediaInteractionObserver(
    o.mediaInteractionCb,
    o.blockClass,
    o.mirror,
  );

  const styleSheetObserver = initStyleSheetObserver(
    o.styleSheetRuleCb,
    currentWindow,
    o.mirror,
  );
  const styleDeclarationObserver = initStyleDeclarationObserver(
    o.styleDeclarationCb,
    currentWindow,
    o.mirror,
  );
  const canvasMutationObserver = o.recordCanvas
    ? initCanvasMutationObserver(
        o.canvasMutationCb,
        currentWindow,
        o.blockClass,
        o.mirror,
      )
    : () => {};
  const fontObserver = o.collectFonts
    ? initFontObserver(o.fontCb, o.doc)
    : () => {};
  // plugins
  const pluginHandlers: listenerHandler[] = [];
  for (const plugin of o.plugins) {
    pluginHandlers.push(
      plugin.observer(plugin.callback, currentWindow, plugin.options),
    );
  }

  return () => {
    mutationObserver.disconnect();
    mousemoveHandler();
    mouseInteractionHandler();
    scrollHandler();
    viewportResizeHandler();
    inputHandler();
    mediaInteractionHandler();
    styleSheetObserver();
    styleDeclarationObserver();
    canvasMutationObserver();
    fontObserver();
    pluginHandlers.forEach((h) => h());
  };
}
```

initMutationObserver

```ts
function initMutationObserver(
  cb: mutationCallBack,
  doc: Document,
  blockClass: blockClass,
  blockSelector: string | null,
  maskTextClass: maskTextClass,
  maskTextSelector: string | null,
  inlineStylesheet: boolean,
  maskInputOptions: MaskInputOptions,
  maskTextFn: MaskTextFn | undefined,
  maskInputFn: MaskInputFn | undefined,
  recordCanvas: boolean,
  slimDOMOptions: SlimDOMOptions,
  mirror: Mirror,
  iframeManager: IframeManager,
  shadowDomManager: ShadowDomManager,
  rootEl: Node,
): MutationObserver {
  const mutationBuffer = new MutationBuffer();
  mutationBuffers.push(mutationBuffer);
  // see mutation.ts for details
  mutationBuffer.init(
    cb,
    blockClass,
    blockSelector,
    maskTextClass,
    maskTextSelector,
    inlineStylesheet,
    maskInputOptions,
    maskTextFn,
    maskInputFn,
    recordCanvas,
    slimDOMOptions,
    doc,
    mirror,
    iframeManager,
    shadowDomManager,
  );
  let mutationObserverCtor =
    window.MutationObserver ||
    /**
     * Some websites may disable MutationObserver by removing it from the window object.
     * If someone is using rrweb to build a browser extention or things like it, they
     * could not change the website's code but can have an opportunity to inject some
     * code before the website executing its JS logic.
     * Then they can do this to store the native MutationObserver:
     * window.__rrMutationObserver = MutationObserver
     */
    (window as WindowWithStoredMutationObserver).__rrMutationObserver;
  const angularZoneSymbol = (window as WindowWithAngularZone)?.Zone?.__symbol__?.(
    'MutationObserver',
  );
  if (
    angularZoneSymbol &&
    ((window as unknown) as Record<string, typeof MutationObserver>)[
      angularZoneSymbol
    ]
  ) {
    mutationObserverCtor = ((window as unknown) as Record<
      string,
      typeof MutationObserver
    >)[angularZoneSymbol];
  }
  const observer = new mutationObserverCtor(
    mutationBuffer.processMutations.bind(mutationBuffer),
  );
  observer.observe(rootEl, {
    attributes: true,
    attributeOldValue: true,
    characterData: true,
    characterDataOldValue: true,
    childList: true,
    subtree: true,
  });
  return observer;
}
```

MutationBuffer 的代码在 packages/rrweb/src/record/mutation.ts  
维护一个 id -> Node 的映射，当出现新增节点时，需要将新节点序列化并加入映射中。

## 3. rrweb-player

回放：

1. 在⼀个沙盒环境中将快照重建为对应的 DOM 树。
2. 将 Oplog 中的操作按照时间戳排列，放⼊⼀个操作队列中。
3. 启动⼀个计时器，不断检查操作队列，将到时间的操作取出重现。


