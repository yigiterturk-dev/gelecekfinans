"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** Görünür etiketi olmayan yerlerde ekran okuyucu için zorunlu. */
  ariaLabel?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Native <select> yerine kullanılan liste kutusu. Tarayıcının kendi açılır
 * menüsü işletim sistemine göre değişiyor ve sitenin tipografisiyle hiç
 * uyuşmuyordu; bu bileşen görünümü siteye bağlar.
 *
 * Erişilebilirlik native select ile aynı seviyede tutulur: klavyeyle açma
 * (Enter/Space/oklar), ok tuşlarıyla gezinme, Home/End, harfe basıp atlama,
 * Esc ile kapatma, dışarı tıklayınca kapanma ve odağın tetikleyiciye dönmesi.
 */
export default function Select({
  value, onChange, options, ariaLabel, id, className, disabled,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const typeAhead = useRef({ text: "", at: 0 });
  const generatedId = useId();
  const listId = `${id || generatedId}-listbox`;

  const selectedIndex = useMemo(
    () => Math.max(0, options.findIndex((option) => option.value === value)),
    [options, value],
  );
  const selected = options[selectedIndex];

  const close = useCallback((focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) buttonRef.current?.focus();
  }, []);

  // Liste açılırken imleç seçili satırdan başlar. State'i efekt içinde değil
  // açma anında kurmak, gereksiz ikinci render'ı da önler.
  const openList = useCallback(() => {
    setActiveIndex(selectedIndex);
    setOpen(true);
  }, [selectedIndex]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // Klavyeyle gezerken seçili satır her zaman görünür kalsın.
  useEffect(() => {
    if (!open) return;
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const commit = (index: number) => {
    const option = options[index];
    if (option) onChange(option.value);
    close();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }
    switch (event.key) {
      case "Escape":
        event.preventDefault();
        close();
        break;
      case "Tab":
        setOpen(false);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        commit(activeIndex);
        break;
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, options.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      default: {
        if (event.key.length !== 1) return;
        const now = Date.now();
        const text = (now - typeAhead.current.at < 800 ? typeAhead.current.text : "") + event.key;
        typeAhead.current = { text, at: now };
        const match = options.findIndex((option) =>
          option.label.toLocaleLowerCase("tr-TR").startsWith(text.toLocaleLowerCase("tr-TR")));
        if (match >= 0) setActiveIndex(match);
      }
    }
  };

  return (
    <div ref={rootRef} className={`sel-root${className ? ` ${className}` : ""}`} onKeyDown={onKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        id={id}
        className="sel-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openList())}
      >
        <span className="sel-value">{selected?.label ?? ""}</span>
        <span className="sel-caret" aria-hidden="true" />
      </button>
      {open && (
        <ul
          ref={listRef}
          id={listId}
          className="sel-list"
          role="listbox"
          aria-label={ariaLabel}
          aria-activedescendant={`${listId}-${activeIndex}`}
          tabIndex={-1}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={option.value === value}
              className={`sel-option${index === activeIndex ? " is-active" : ""}${option.value === value ? " is-selected" : ""}`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => commit(index)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
