export const extractInitials = (source: string) =>
  source
    .split(' ')
    .map(part =>
      part && part.length > 3
        ? part[0]
            .split('(')[0]
            .replaceAll(/[^a-zA-Z0-9]/g, '')
            .toUpperCase()
        : part || ''
    )
    .join('');
