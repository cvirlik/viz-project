export const extractInitials = (source: string) =>
  source
    .split(/[^a-zA-Z0-9]/)
    .map(part =>
      part && part.length > 3
        ? part
            .slice(0, 2)
            .split('(')[0]
            .replaceAll(/[^a-zA-Z0-9]/g, '')
            .toUpperCase()
        : part || ''
    )
    .join('')
    .slice(0, 5);
