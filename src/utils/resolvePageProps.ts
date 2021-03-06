import path from "path";
import { ReactElement } from "react";

export interface Props {
  default?: ReactElement;
  [key: string]: any;
}

// Graceful resolve
const resolve = (...segments: string[]) => {
  try {
    const resolved = require.resolve(path.join(...segments));

    if (module.hot) {
      module.hot.accept(resolved, () => {
        console.info("♻️  Reloaded", resolved.replace(process.cwd(), "."));
      });
    }

    return resolved;
  } catch (error) {
    return null;
  }
};

export default async function resolvePageProps(pagePath: string) {
  const propsFile = resolve(path.dirname(pagePath));

  if (!propsFile) {
    return {};
  }

  const { default: PageLayout, ...exported } = await import(propsFile);

  const keys = Object.keys(exported);
  const values = await Promise.all(
    Object.entries(exported).map(([prop, value]) => {
      // Return layout as-is
      if (prop === "default") {
        return value;
      }

      if (typeof value === "function") {
        return value();
        // TODO Are there any values to supply for resolution?
      }

      // Enforce all exports being functions, otherwise we won't be able
      // to differentiate a Component from a resolver.
      throw new Error(
        `${propsFile}'s ${JSON.stringify(prop)} should be a Function`
      );
    })
  );

  const props: Props = keys.reduce((acc, key, i) => {
    return {
      ...acc,
      [key]: values[i]
    };
  }, {});

  // Combine layout with resolved props
  if (PageLayout) {
    props.default = PageLayout;
  }

  return props;
}
