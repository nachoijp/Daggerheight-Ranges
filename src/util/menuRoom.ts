import { createContext, useContext, useRef, useState, type SyntheticEvent } from "react";

/**
 * Popovers sized to their content can be short, but dropdown menus open
 * inside the popover's own frame and size themselves to the room there is
 * at the moment they open — in a short popover they came out cramped, with
 * a scrollbar. A popover page provides this to grow first: `request` makes
 * room (resolving once the frame has actually grown), `release` lets the
 * page shrink back to fit. Without a provider both do nothing.
 */
export type MenuRoom = { request: () => Promise<void>; release: () => void };

export const MenuRoomContext = createContext<MenuRoom>({
  request: async () => {},
  release: () => {},
});

/**
 * Open state for a menu that asks for room before it opens. `open(anchor)`
 * takes the element a Menu anchors to (or nothing for a Select).
 */
export function useRoomyMenu<T = true>() {
  const room = useContext(MenuRoomContext);
  const [openWith, setOpenWith] = useState<T | null>(null);
  // Set while room is being made: a Select fires onOpen on mousedown, so a
  // quick double click asked twice — then one close released only one of
  // the two, leaving the popover stuck at full height.
  const opening = useRef(false);
  return {
    isOpen: openWith !== null,
    anchor: openWith,
    async open(value: T) {
      if (openWith !== null || opening.current) {
        return;
      }
      opening.current = true;
      try {
        await room.request();
      } finally {
        opening.current = false;
      }
      setOpenWith(value);
    },
    close() {
      // A menu item's own click and the menu's onClose can both land.
      if (openWith === null) {
        return;
      }
      setOpenWith(null);
      room.release();
    },
  };
}

/** Resolves once Owlbear has actually resized this popover's frame to at least `height` (or after a short wait regardless). */
export function viewportReaches(height: number) {
  return new Promise<void>((resolve) => {
    if (window.innerHeight >= height - 2) {
      resolve();
      return;
    }
    const done = () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(timeout);
      resolve();
    };
    const onResize = () => {
      if (window.innerHeight >= height - 2) {
        done();
      }
    };
    const timeout = setTimeout(done, 300);
    window.addEventListener("resize", onResize);
  });
}

/** Space kept between a fitted menu and the edge of the popover. */
const FITTED_MENU_MARGIN = 8;

/**
 * A Select's menu that opens straight away in the room the popover already
 * has — below the field ("down") or above it ("up") — and scrolls when the
 * list is longer than that, instead of growing the popover first (see
 * useRoomyMenu). For dropdowns whose lists are often long: growing the
 * popover to full height every time they opened made it jump. Spread
 * `selectProps` on the Select.
 */
export function useFittedMenu(direction: "down" | "up") {
  const [maxHeight, setMaxHeight] = useState<number | null>(null);
  return {
    isOpen: maxHeight !== null,
    selectProps: {
      open: maxHeight !== null,
      onOpen: (event: SyntheticEvent) => {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const room = direction === "down" ? window.innerHeight - rect.bottom : rect.top;
        setMaxHeight(Math.max(0, room - FITTED_MENU_MARGIN));
      },
      onClose: () => setMaxHeight(null),
      MenuProps: {
        anchorOrigin: { vertical: direction === "down" ? "bottom" : "top", horizontal: "left" },
        transformOrigin: { vertical: direction === "down" ? "top" : "bottom", horizontal: "left" },
        marginThreshold: FITTED_MENU_MARGIN,
        slotProps: { paper: { sx: { maxHeight: maxHeight ?? undefined } } },
      },
    } as const,
  };
}
