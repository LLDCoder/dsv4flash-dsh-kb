const toPath = (path) => {
  if (Array.isArray(path)) return path;
  return String(path)
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);
};

const get = (value, path, defaultValue) => {
  const result = toPath(path).reduce(
    (current, key) =>
      current === undefined || current === null ? undefined : current[key],
    value,
  );
  return result === undefined ? defaultValue : result;
};

export { get };
export default get;
