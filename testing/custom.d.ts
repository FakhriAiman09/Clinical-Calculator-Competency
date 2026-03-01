// custom.d.ts or images.d.ts (can be named anything)
declare module '*.svg' {
    const content: string;
    export default content;
  }