"use client";

import { useEffect } from "react";

type DragState = {
  pointerId: number;
  startX: number;
  startScrollLeft: number;
  moved: boolean;
};

export function HorizontalScrollEnhancer() {
  useEffect(() => {
    const rows = Array.from(document.querySelectorAll<HTMLElement>(".scroll-row"));
    const states = new WeakMap<HTMLElement, DragState>();

    const cleanups = rows.map(row => {
      const handlePointerDown = (event: PointerEvent) => {
        if (event.pointerType !== "mouse" || event.button !== 0) {
          return;
        }

        states.set(row, {
          pointerId: event.pointerId,
          startX: event.clientX,
          startScrollLeft: row.scrollLeft,
          moved: false
        });

        row.dataset.dragging = "true";
        row.setPointerCapture(event.pointerId);
      };

      const handlePointerMove = (event: PointerEvent) => {
        const state = states.get(row);

        if (!state || state.pointerId !== event.pointerId) {
          return;
        }

        const delta = event.clientX - state.startX;

        if (Math.abs(delta) > 4) {
          state.moved = true;
        }

        row.scrollLeft = state.startScrollLeft - delta;
      };

      const stopDragging = (event: PointerEvent) => {
        const state = states.get(row);

        if (!state || state.pointerId !== event.pointerId) {
          return;
        }

        if (row.hasPointerCapture(event.pointerId)) {
          row.releasePointerCapture(event.pointerId);
        }

        window.setTimeout(() => {
          delete row.dataset.dragging;
        }, 0);

        states.delete(row);
      };

      const handleClick = (event: MouseEvent) => {
        const state = states.get(row);

        if (state?.moved) {
          event.preventDefault();
          event.stopPropagation();
          states.delete(row);
        }
      };

      row.addEventListener("pointerdown", handlePointerDown);
      row.addEventListener("pointermove", handlePointerMove);
      row.addEventListener("pointerup", stopDragging);
      row.addEventListener("pointercancel", stopDragging);
      row.addEventListener("lostpointercapture", stopDragging);
      row.addEventListener("click", handleClick, true);

      return () => {
        row.removeEventListener("pointerdown", handlePointerDown);
        row.removeEventListener("pointermove", handlePointerMove);
        row.removeEventListener("pointerup", stopDragging);
        row.removeEventListener("pointercancel", stopDragging);
        row.removeEventListener("lostpointercapture", stopDragging);
        row.removeEventListener("click", handleClick, true);
      };
    });

    return () => {
      cleanups.forEach(cleanup => cleanup());
    };
  }, []);

  return null;
}
