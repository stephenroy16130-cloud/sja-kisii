"use client";

import { useRef } from "react";

const BTN = "rounded-lg px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/10 hover:text-white";

export default function RichEditor({
  onChange,
  resetKey,
}: {
  onChange: (html: string) => void;
  resetKey: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const emit = () => onChange(ref.current?.innerHTML ?? "");

  function run(cmd: string, value?: string) {
    document.execCommand(cmd, false, value);
    emit();
  }
  function link() {
    const url = window.prompt("Link address (https://...)");
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      window.alert("Links must start with http:// or https://");
      return;
    }
    run("createLink", url);
  }
  // Keeps the text selection while a toolbar button is pressed
  const keep = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 focus-within:border-white/60">
      <div className="flex flex-wrap gap-1 border-b border-white/10 p-1.5">
        <button type="button" onMouseDown={keep} onClick={() => run("bold")} className={`${BTN} font-bold`}>B</button>
        <button type="button" onMouseDown={keep} onClick={() => run("italic")} className={`${BTN} italic`}>I</button>
        <button type="button" onMouseDown={keep} onClick={() => run("underline")} className={`${BTN} underline`}>U</button>
        <button type="button" onMouseDown={keep} onClick={() => run("formatBlock", "h3")} className={BTN}>Heading</button>
        <button type="button" onMouseDown={keep} onClick={() => run("insertUnorderedList")} className={BTN}>• List</button>
        <button type="button" onMouseDown={keep} onClick={() => run("insertOrderedList")} className={BTN}>1. List</button>
        <button type="button" onMouseDown={keep} onClick={() => run("formatBlock", "blockquote")} className={BTN}>Quote</button>
        <button type="button" onMouseDown={keep} onClick={link} className={BTN}>Link</button>
      </div>
      <div
        key={resetKey}
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onPaste={(e) => {
          e.preventDefault();
          document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
          emit();
        }}
        className="rich min-h-44 px-4 py-3 text-sm outline-none"
      />
    </div>
  );
}
