export function fieldErrors(errors, path) {
  return (errors ?? []).filter((e) => e.startsWith(`${path}:`)).map((e) => e.slice(path.length + 1).trim());
}
