export function stripHtml(value) {
    if (!value || typeof value !== "string") return "";

    const withoutTags = value
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<\/div>/gi, "\n")
        .replace(/<\/li>/gi, "\n")
        .replace(/<[^>]*>/g, "");

    if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.innerHTML = withoutTags;
        return textarea.value;
    }

    return withoutTags
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

export function getNoteContent(item) {
    if (!item) return "";

    const content =
        item.content ||
        item.value ||
        item.text ||
        item.body ||
        item.attributes?.content ||
        item.attributes?.value ||
        item.attributes?.text ||
        item.attributes?.body ||
        null;

    if (typeof content === "string" && content) {
        return content;
    }

    if (content && typeof content === "object") {
        if (typeof content.markdown === "string" && content.markdown) return content.markdown;
        if (typeof content.html === "string" && content.html) return stripHtml(content.html).trim();
        if (typeof content.plain === "string" && content.plain) return content.plain;
    }

    const html =
        item.content_html ||
        item.description_html ||
        item.attributes?.content_html ||
        item.attributes?.description_html ||
        "";

    if (typeof html === "string" && html) {
        return stripHtml(html).trim();
    }

    const description =
        item.description ||
        item.attributes?.description ||
        "";

    if (typeof description === "string" && description) {
        return description;
    }

    return "";
}
