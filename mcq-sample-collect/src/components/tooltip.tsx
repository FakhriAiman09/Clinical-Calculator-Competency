'use client';

import type { Tooltip as BsTooltip } from 'bootstrap';
import React, { useEffect, useRef, type JSX } from 'react';

export const Tooltip = (p: { children: JSX.Element; text: string; placement: 'top' | 'bottom' | 'left' | 'right' }) => {
  const childRef = useRef(undefined as unknown as Element);

  useEffect(() => {
    let t: BsTooltip | undefined;
    import('bootstrap').then(({ Tooltip }) => {
      t = new Tooltip(childRef.current, {
        title: p.text,
        placement: p.placement,
        trigger: 'hover',
      });
    });

    return () => {
      if (t) (t as BsTooltip).dispose();
    };
  }, [p.placement, p.text]);

  return React.cloneElement(p.children, { ref: childRef });
};
