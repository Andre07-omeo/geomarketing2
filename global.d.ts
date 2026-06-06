// global.d.ts
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module 'leaflet/dist/leaflet.css' {
  const content: any;
  export default content;
}

declare module 'leaflet.heat' {
  const content: any;
  export default content;
}