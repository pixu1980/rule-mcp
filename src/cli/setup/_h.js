/**
 * @module cli/setup/h
 *
 * `React.createElement` under a short name, plus the Ink primitives every
 * view needs.
 *
 * No JSX anywhere in this package: the repository ships source straight to
 * npm with no build step, and adding a transpiler for the installer's sake
 * would mean the installer could not run from a checkout.
 */

import React from "react";

/** `h(Component, props, ...children)` - React.createElement. */
export const h = React.createElement;

/** The hooks the views use, re-exported so a view imports one module. */
export const { useCallback, useEffect, useMemo, useRef, useState } = React;

export { Box, Text, useApp, useInput, useStdout } from "ink";
export { default as React } from "react";
