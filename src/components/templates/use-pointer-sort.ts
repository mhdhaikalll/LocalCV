"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Vertical travel, in px, before a pointer press becomes a drag. */
export const POINTER_DRAG_THRESHOLD = 6;

/**
 * Move one item to another position. `toIndex` is the destination in the array
 * *after* the item is removed, which is what a pointer insertion slot means.
 */
export function moveItem<T>(items: readonly T[], fromIndex: number, toIndex: number): T[] {
  const next = items.slice();
  if (fromIndex === toIndex) return next;
  const [item] = next.splice(fromIndex, 1);
  next.splice(Math.max(0, Math.min(next.length, toIndex)), 0, item);
  return next;
}

interface RowSlot {
  top: number;
  bottom: number;
  center: number;
}

type Listener = [string, EventListener, AddEventListenerOptions | boolean];

interface DragSession<T extends string> {
  id: T;
  pointerId: number;
  startY: number;
  pointerY: number;
  activated: boolean;
  finished: boolean;
  activeEl: HTMLElement | null;
  containerTop: number;
  containerScrollTop: number;
  slots: RowSlot[];
  indicatorTops: number[];
  previousTouchAction: string;
  previousUserSelect: string;
  listeners: Listener[];
}

export interface PointerSortOptions<T extends string> {
  ids: readonly T[];
  onCommit: (next: T[]) => void;
  labelFor: (id: T) => string;
}

export interface PointerSortState<T extends string> {
  activeId: T | null;
  insertionIndex: number | null;
  indicatorTop: number | null;
  announcement: string;
  setRowRef: (id: T, element: HTMLElement | null) => void;
  startDrag: (id: T, index: number, event: React.PointerEvent<HTMLElement>) => void;
}

/**
 * Pointer-driven list sorting with no dependency and no per-frame React work.
 * The dragged row is translated by writing `transform` straight to its node;
 * state only changes when the pointer crosses a row boundary.
 *
 * Rows must be direct children of one container: the container used for
 * geometry is the active row's parent element.
 */
export function usePointerSort<T extends string>({
  ids,
  onCommit,
  labelFor,
}: PointerSortOptions<T>): PointerSortState<T> {
  const [activeId, setActiveId] = useState<T | null>(null);
  const [insertionIndex, setInsertionIndex] = useState<number | null>(null);
  const [indicatorTop, setIndicatorTop] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const rowsRef = useRef(new Map<T, HTMLElement>());
  const sessionRef = useRef<DragSession<T> | null>(null);
  const rafRef = useRef<number | null>(null);
  const idsRef = useRef<readonly T[]>(ids);
  const onCommitRef = useRef(onCommit);
  const labelForRef = useRef(labelFor);
  const insertionRef = useRef<number | null>(null);

  useEffect(() => {
    idsRef.current = ids;
    onCommitRef.current = onCommit;
    labelForRef.current = labelFor;
  }, [ids, onCommit, labelFor]);

  // Clear up a drag that is still live when the drawer unmounts mid-gesture.
  useEffect(() => {
    const sessions = sessionRef;
    const raf = rafRef;
    return () => {
      const session = sessions.current;
      if (!session) return;
      session.finished = true;
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      for (const [type, listener, options] of session.listeners) {
        window.removeEventListener(type, listener, options);
      }
      if (session.activeEl?.hasPointerCapture?.(session.pointerId)) {
        session.activeEl.releasePointerCapture(session.pointerId);
      }
      if (session.activeEl) {
        session.activeEl.style.transform = "";
        session.activeEl.style.willChange = "";
      }
      document.body.style.touchAction = session.previousTouchAction;
      document.body.style.userSelect = session.previousUserSelect;
      sessions.current = null;
    };
  }, []);

  const setRowRef = useCallback((id: T, element: HTMLElement | null) => {
    if (element) rowsRef.current.set(id, element);
    else rowsRef.current.delete(id);
  }, []);

  function teardown(session: DragSession<T>) {
    if (session.finished) return;
    session.finished = true;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    for (const [type, listener, options] of session.listeners) {
      window.removeEventListener(type, listener, options);
    }
    session.listeners = [];
    if (session.activeEl?.hasPointerCapture?.(session.pointerId)) {
      session.activeEl.releasePointerCapture(session.pointerId);
    }
    if (session.activeEl) {
      session.activeEl.style.transform = "";
      session.activeEl.style.willChange = "";
    }
    document.body.style.touchAction = session.previousTouchAction;
    document.body.style.userSelect = session.previousUserSelect;
    if (sessionRef.current === session) sessionRef.current = null;
    setActiveId(null);
    setInsertionIndex(null);
    setIndicatorTop(null);
    insertionRef.current = null;
  }

  /** Ends the drag and, when it actually moved, records exactly one commit. */
  function settle(session: DragSession<T>) {
    const toIndex = insertionRef.current;
    const order = idsRef.current;
    const { id, activated } = session;
    teardown(session);
    if (!activated || toIndex === null) return;

    const fromIndex = order.indexOf(id);
    if (fromIndex === -1) return;
    const next = moveItem(order, fromIndex, toIndex);
    if (next.every((value, i) => value === order[i])) return;

    setAnnouncement(
      `${labelForRef.current(id)} moved to position ${next.indexOf(id) + 1} of ${next.length}`,
    );
    onCommitRef.current(next as T[]);
  }

  function onPointerMove(event: PointerEvent) {
    const session = sessionRef.current;
    if (!session || session.finished) return;
    if (event.pointerId !== session.pointerId) return;

    session.pointerY = event.clientY;

    if (!session.activated) {
      if (Math.abs(event.clientY - session.startY) < POINTER_DRAG_THRESHOLD) return;
      const activeEl = rowsRef.current.get(session.id) ?? null;
      const container = activeEl?.parentElement ?? null;
      if (!activeEl || !container) return;

      session.activated = true;
      session.activeEl = activeEl;
      session.previousTouchAction = document.body.style.touchAction;
      session.previousUserSelect = document.body.style.userSelect;
      document.body.style.touchAction = "none";
      document.body.style.userSelect = "none";
      activeEl.style.willChange = "transform";
      try {
        activeEl.setPointerCapture(session.pointerId);
      } catch {
        // Best-effort: window-level listeners still receive the gesture.
      }

      const containerRect = container.getBoundingClientRect();
      session.containerTop = containerRect.top;
      session.containerScrollTop = container.scrollTop;

      const slots: RowSlot[] = [];
      for (const id of idsRef.current) {
        if (id === session.id) continue;
        const element = rowsRef.current.get(id);
        if (!element) continue;
        const rect = element.getBoundingClientRect();
        const top = rect.top - containerRect.top + container.scrollTop;
        const bottom = rect.bottom - containerRect.top + container.scrollTop;
        slots.push({ top, bottom, center: (top + bottom) / 2 });
      }
      session.slots = slots;
      session.indicatorTops = slots.map((slot) => slot.top);
      session.indicatorTops.push(slots.length ? slots[slots.length - 1].bottom : 0);
      setActiveId(session.id);
    }

    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const current = sessionRef.current;
      if (!current || current.finished || !current.activated) return;
      if (current.activeEl) {
        current.activeEl.style.transform = `translateY(${current.pointerY - current.startY}px)`;
      }
      const pointerY =
        current.pointerY - current.containerTop + current.containerScrollTop;
      let nextIndex = 0;
      for (const slot of current.slots) {
        if (pointerY > slot.center) nextIndex++;
      }
      if (nextIndex !== insertionRef.current) {
        insertionRef.current = nextIndex;
        setInsertionIndex(nextIndex);
        setIndicatorTop(current.indicatorTops[nextIndex] ?? null);
      }
    });
  }

  function onPointerUp(event: PointerEvent) {
    const session = sessionRef.current;
    if (!session || session.finished) return;
    if (event.pointerId !== session.pointerId) return;
    settle(session);
  }

  function onPointerCancel() {
    const session = sessionRef.current;
    if (!session || session.finished) return;
    teardown(session);
  }

  // A scroll mid-drag invalidates the cached row geometry, so cancel instead.
  function onScroll() {
    const session = sessionRef.current;
    if (session?.activated) teardown(session);
  }

  function startDrag(id: T, index: number, event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const existing = sessionRef.current;
    if (existing) teardown(existing);

    const listeners: Listener[] = [
      ["pointermove", onPointerMove as EventListener, { passive: true }],
      ["pointerup", onPointerUp as EventListener, false],
      ["pointercancel", onPointerCancel as EventListener, false],
      ["lostpointercapture", onPointerCancel as EventListener, false],
      ["scroll", onScroll as EventListener, true],
    ];
    for (const [type, listener, options] of listeners) {
      window.addEventListener(type, listener, options);
    }

    sessionRef.current = {
      id,
      pointerId: event.pointerId,
      startY: event.clientY,
      pointerY: event.clientY,
      activated: false,
      finished: false,
      activeEl: null,
      containerTop: 0,
      containerScrollTop: 0,
      slots: [],
      indicatorTops: [],
      previousTouchAction: "",
      previousUserSelect: "",
      listeners,
    };
    insertionRef.current = index;
  }

  return {
    activeId,
    insertionIndex,
    indicatorTop,
    announcement,
    setRowRef,
    startDrag,
  };
}
