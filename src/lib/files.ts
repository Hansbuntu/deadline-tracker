// Small helpers for files the app hands to you.

/** A safe file name from any text: "Résidence Gare 2027!" → "residence-gare-2027". */
export function slugify(text: string): string {
  const slug = text
    .normalize('NFKD') // split "é" into "e" + accent mark…
    .replace(/[̀-ͯ]/g, '') // …then drop the accent marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return slug || 'opportunity'
}

/**
 * Give the browser a file to save. The file is built in memory (a "Blob"),
 * so nothing is uploaded anywhere. On phones, .ics files usually open
 * straight in the Calendar app.
 */
export function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  // Give the browser a moment to start the download before freeing the memory.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
