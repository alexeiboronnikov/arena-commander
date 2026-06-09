import { getNoteContent, stripHtml } from "./noteContent";

export function getFirstTextLine(item) {
    const raw = getNoteContent(item);

    if (typeof raw !== "string") return "";

    const plainText = stripHtml(raw)
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .trim();

    const firstLine = plainText
        .split("\n")
        .map(line => line.trim())
        .find(Boolean);

    return firstLine || "";
}

export function truncateTitle(title, maxLength = 80) {
    if (!title) return "";

    const value = String(title);

    return value.length > maxLength
        ? `${value.slice(0, maxLength - 1)}…`
        : value;
}

export function getItemDisplayName(item) {
    if (!item) return "Untitled";

    const normalTitle =
        item.title ||
        item.full_name ||
        item.name ||
        item.username ||
        item.slug ||
        "";

    const isUntitled =
        !String(normalTitle).trim() ||
        String(normalTitle).trim().toLowerCase() === "untitled";

    if (isUntitled) {
        const firstLine = getFirstTextLine(item);

        if (firstLine) {
            return truncateTitle(firstLine);
        }

        return "Untitled";
    }

    return truncateTitle(normalTitle);
}
