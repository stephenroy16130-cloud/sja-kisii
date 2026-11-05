export const MAX_DOC_BYTES = 100 * 1024 * 1024;

export const DOC_MIME: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export const docExt = (name: string): string | null => {
  const m = /\.(pdf|docx?)$/i.exec(name);
  return m ? m[1].toLowerCase() : null;
};
