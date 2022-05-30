declare module 'ogl' {
  type BasisImage = (Uint8Array | Uint16Array) & {
    width: number
    height: number
    isCompressedTexture: true
    internalFormat: number
    isBasis: true
  }

  export class BasisManager {
    constructor(workerSrc: string | URL)
    getSupportedFormat(): 'astc' | 'bptc' | 's3tc' | 'etc1' | 'pvrtc' | 'none'
    initWorker(workerSrc: string | URL): void
    onMessage(msg: { data: { id: number; error: string; image: BasisImage } }): void
    parseTexture(buffer: ArrayBuffer): Promise<BasisImage>
  }

  export type CameraOptions = {
    near: number
    far: number
    fov: number
    aspect: number
    left: number
    right: number
    bottom: number
    top: number
    zoom: number
  }
  export class Camera extends Transform {
    near: number
    far: number
    fov: number
    aspect: number
    left: number
    right: number
    bottom: number
    top: number
    zoom: number
    projectionMatrix: Mat4
    viewMatrix: Mat4
    projectionViewMatrix: Mat4
    worldPosition: Vec3
    type: 'perspective' | 'orthographic'
    frustum: Vec3[]
    constructor(
      gl: OGLRenderingContext,
      { near, far, fov, aspect, left, right, bottom, top, zoom }?: Partial<CameraOptions>,
    )
    perspective({ near, far, fov, aspect }?: { near?: number; far?: number; fov?: number; aspect?: number }): this
    orthographic({
      near,
      far,
      left,
      right,
      bottom,
      top,
      zoom,
    }?: {
      near?: number
      far?: number
      left?: number
      right?: number
      bottom?: number
      top?: number
      zoom?: number
    }): this
    updateMatrixWorld(): this
    lookAt(target: Vec3): this
    project(v: Vec3): this
    unproject(v: Vec3): this
    updateFrustum(): void
    frustumIntersectsMesh(node: Mesh): boolean
    frustumIntersectsSphere(center: Vec3, radius: number): boolean
  }

  export type AttributeMap = {
    [key: string]: Partial<Attribute>
  }
  export type Attribute = {
    size: number
    data: ArrayLike<number> | ArrayBufferView
    instanced?: null | number | boolean
    type: GLenum
    normalized: boolean
    target?: number
    id?: number
    buffer?: WebGLBuffer
    stride: number
    offset: number
    count?: number
    divisor?: number
    needsUpdate?: boolean
    usage?: number
  }
  export type Bounds = {
    min: Vec3
    max: Vec3
    center: Vec3
    scale: Vec3
    radius: number
  }
  export class Geometry {
    gl: OGLRenderingContext
    id: number
    attributes: AttributeMap
    VAOs: {
      [programKey: string]: WebGLVertexArrayObject
    }
    drawRange: {
      start: number
      count: number
    }
    instancedCount: number
    glState: RenderState
    isInstanced: boolean
    bounds: Bounds
    raycast?: 'sphere' | 'box'
    constructor(
      gl: OGLRenderingContext,
      attributes?: {
        [key: string]: Partial<Attribute>
      },
    )
    addAttribute(key: string, attr: Partial<Attribute>): number
    updateAttribute(attr: Partial<Attribute>): void
    setIndex(value: Attribute): void
    setDrawRange(start: number, count: number): void
    setInstancedCount(value: number): void
    createVAO(program: Program): void
    bindAttributes(program: Program): void
    draw({ program, mode }: { program: any; mode?: number }): void
    getPosition(): true | Partial<Attribute>
    computeBoundingBox(attr?: Partial<Attribute>): void
    computeBoundingSphere(attr?: Partial<Attribute>): void
    computeVertexNormals(): void
    normalizeNormals(): void
    remove(): void
  }

  export interface MeshOptions {
    geometry: Geometry
    program: Program
    mode: GLenum
    frustumCulled: boolean
    renderOrder: number
  }
  export interface DrawOptions {
    camera: Camera
  }
  export type MeshRenderCallback = (renderInfo: { mesh: Mesh; camera?: Camera }) => any
  export class Mesh extends Transform {
    name: string
    numInstances?: number
    gl: OGLRenderingContext
    id: number
    geometry: Geometry
    program: Program
    mode: GLenum
    frustumCulled: boolean
    renderOrder: number
    modelViewMatrix: Mat4
    normalMatrix: Mat3
    beforeRenderCallbacks: Array<MeshRenderCallback>
    afterRenderCallbacks: Array<MeshRenderCallback>
    hit: Partial<{
      localPoint: Vec3
      distance: number
      point: Vec3
      faceNormal: Vec3
      localFaceNormal: Vec3
      uv: Vec2
      localNormal: Vec3
      normal: Vec3
    }>
    constructor(gl: OGLRenderingContext, { geometry, program, mode, frustumCulled, renderOrder }?: Partial<MeshOptions>)
    onBeforeRender(f: MeshRenderCallback): this
    onAfterRender(f: MeshRenderCallback): this
    draw({ camera }?: { camera?: Camera }): void
  }

  export type ProgramOptions = {
    vertex: string
    fragment: string
    uniforms: {
      [name: string]: {
        value: any
      }
    }
    transparent: boolean
    cullFace: GLenum | false
    frontFace: GLenum
    depthTest: boolean
    depthWrite: boolean
    depthFunc: GLenum
  }
  export interface BlendFunc {
    src?: GLenum
    dst?: GLenum
    srcAlpha?: number
    dstAlpha?: number
  }
  export interface BlendEquation {
    modeRGB?: number
    modeAlpha?: number
  }
  export interface UniformInfo extends WebGLActiveInfo {
    uniformName: string
    isStruct: boolean
    isStructArray: boolean
    structIndex: number
    structProperty: string
  }
  export class Program {
    gl: OGLRenderingContext
    uniforms: {
      [name: string]: {
        value: any
      }
    }
    id: number
    transparent: boolean
    cullFace: GLenum | false
    frontFace: GLenum
    depthTest: boolean
    depthWrite: boolean
    depthFunc: GLenum
    blendFunc: BlendFunc
    blendEquation: BlendEquation
    program: WebGLProgram
    uniformLocations: Map<any, WebGLUniformLocation>
    attributeLocations: Map<WebGLActiveInfo, GLint>
    attributeOrder: string
    gltfMaterial?: any
    constructor(
      gl: OGLRenderingContext,
      {
        vertex,
        fragment,
        uniforms,
        transparent,
        cullFace,
        frontFace,
        depthTest,
        depthWrite,
        depthFunc,
      }?: Partial<ProgramOptions>,
    )
    setBlendFunc(src: number, dst: number, srcAlpha?: number, dstAlpha?: number): void
    setBlendEquation(modeRGB: GLenum, modeAlpha: GLenum): void
    applyState(): void
    use({ flipFaces }?: { flipFaces?: boolean }): void
    remove(): void
  }

  export interface RendererOptions {
    canvas: HTMLCanvasElement
    width: number
    height: number
    dpr: number
    alpha: boolean
    depth: boolean
    stencil: boolean
    antialias: boolean
    premultipliedAlpha: boolean
    preserveDrawingBuffer: boolean
    powerPreference: string
    autoClear: boolean
    webgl: number
  }
  export type OGLRenderingContext = {
    renderer: Renderer
    canvas: HTMLCanvasElement
  } & (WebGL2RenderingContext | WebGLRenderingContext)
  export type DeviceParameters = {
    maxTextureUnits?: number
    maxAnisotropy?: number
  }
  export type RenderState = {
    blendFunc?: {
      src: GLenum
      dst: GLenum
      srcAlpha?: GLenum
      dstAlpha?: GLenum
    }
    blendEquation?: {
      modeRGB: GLenum
      modeAlpha?: GLenum
    }
    cullFace?: number
    frontFace?: number
    depthMask?: boolean
    depthFunc?: number
    premultiplyAlpha?: boolean
    flipY?: boolean
    unpackAlignment?: number
    viewport?: {
      x: number
      y: number
      width: number | null
      height: number | null
    }
    textureUnits?: Array<number>
    activeTextureUnit?: number
    framebuffer?: WebGLFramebuffer
    boundBuffer?: WebGLBuffer
    uniformLocations?: Map<number, WebGLUniformLocation>
    currentProgram: number | null
  }
  export type RenderExtensions = {
    [key: string]: any
  }
  export class Renderer {
    dpr: number
    alpha: boolean
    color: boolean
    depth: boolean
    stencil: boolean
    premultipliedAlpha: boolean
    autoClear: boolean
    gl: OGLRenderingContext
    isWebgl2: boolean
    width: number
    height: number
    parameters: DeviceParameters
    state: RenderState
    extensions: RenderExtensions
    vertexAttribDivisor: Function
    drawArraysInstanced: Function
    drawElementsInstanced: Function
    createVertexArray: Function
    bindVertexArray: Function
    deleteVertexArray: Function
    drawBuffers: Function
    currentProgram: number
    currentGeometry: string | null
    get id(): number
    private _id
    constructor({
      canvas,
      width,
      height,
      dpr,
      alpha,
      depth,
      stencil,
      antialias,
      premultipliedAlpha,
      preserveDrawingBuffer,
      powerPreference,
      autoClear,
      webgl,
    }?: Partial<RendererOptions>)
    setSize(width: number, height: number): void
    setViewport(width: number, height: number, x?: number, y?: number): void
    setScissor(width: number, height: number, x?: number, y?: number): void
    enable(id: GLenum): void
    disable(id: GLenum): void
    setBlendFunc(src: GLenum, dst: GLenum, srcAlpha: GLenum, dstAlpha: GLenum): void
    setBlendEquation(modeRGB: GLenum, modeAlpha: GLenum): void
    setCullFace(value: GLenum): void
    setFrontFace(value: GLenum): void
    setDepthMask(value: GLboolean): void
    setDepthFunc(value: GLenum): void
    activeTexture(value: number): void
    bindFramebuffer({ target, buffer }?: { target?: number; buffer?: WebGLFramebuffer }): void
    getExtension(extension: string, webgl2Func?: keyof WebGL2RenderingContext, extFunc?: string): any
    sortOpaque(a: any, b: any): number
    sortTransparent(a: any, b: any): number
    sortUI(a: any, b: any): number
    getRenderList({
      scene,
      camera,
      frustumCull,
      sort,
    }: {
      scene: Transform
      camera: Camera
      frustumCull: boolean
      sort: boolean
    }): any[]
    render({
      scene,
      camera,
      target,
      update,
      sort,
      frustumCull,
      clear,
    }: Partial<{
      scene: Transform
      camera: Camera
      target: RenderTarget
      update: boolean
      sort: boolean
      frustumCull: boolean
      clear: boolean
    }>): void
  }

  export interface RenderTargetOptions {
    width: number
    height: number
    target: GLenum
    color: number
    depth: boolean
    stencil: boolean
    depthTexture: boolean
    wrapS: GLenum
    wrapT: GLenum
    minFilter: GLenum
    magFilter: GLenum
    type: GLenum
    format: GLenum
    internalFormat: GLenum
    unpackAlignment: number
    premultiplyAlpha: boolean
  }
  export class RenderTarget {
    gl: OGLRenderingContext
    width: number
    height: number
    depth: boolean
    buffer: WebGLFramebuffer
    target: number
    textures: Texture[]
    texture: Texture
    depthTexture: Texture
    depthBuffer: WebGLRenderbuffer
    stencilBuffer: WebGLRenderbuffer
    depthStencilBuffer: WebGLRenderbuffer
    constructor(
      gl: OGLRenderingContext,
      {
        width,
        height,
        target,
        color,
        depth,
        stencil,
        depthTexture,
        wrapS,
        wrapT,
        minFilter,
        magFilter,
        type,
        format,
        internalFormat,
        unpackAlignment,
        premultiplyAlpha,
      }?: Partial<RenderTargetOptions>,
    )
    setSize(width: number, height: number): void
  }

  export interface TextureOptions {
    image: HTMLImageElement | HTMLVideoElement | HTMLImageElement[] | ArrayBufferView
    target: number
    type: number
    format: number
    internalFormat: number
    wrapS: number
    wrapT: number
    generateMipmaps: boolean
    minFilter: number
    magFilter: number
    premultiplyAlpha: boolean
    unpackAlignment: number
    flipY: boolean
    level: number
    width: number
    height: number
    anisotropy: number
  }
  export type CompressedImage = {
    isCompressedTexture?: boolean
  } & {
    data: Uint8Array
    width: number
    height: number
  }[]
  export class Texture {
    ext: string
    gl: OGLRenderingContext
    id: number
    name: string
    image: HTMLImageElement | HTMLVideoElement | HTMLImageElement[] | ArrayBufferView | CompressedImage
    target: number
    type: number
    format: number
    internalFormat: number
    wrapS: number
    wrapT: number
    generateMipmaps: boolean
    minFilter: number
    magFilter: number
    premultiplyAlpha: boolean
    unpackAlignment: number
    flipY: boolean
    level: number
    width: number
    height: number
    anisotropy: number
    texture: WebGLTexture
    store: {
      image: any
    }
    glState: RenderState
    state: {
      minFilter: number
      magFilter: number
      wrapS: number
      wrapT: number
      anisotropy: number
    }
    needsUpdate: Boolean
    onUpdate?: () => void
    constructor(
      gl: OGLRenderingContext,
      {
        image,
        target,
        type,
        format,
        internalFormat,
        wrapS,
        wrapT,
        generateMipmaps,
        minFilter,
        magFilter,
        premultiplyAlpha,
        unpackAlignment,
        flipY,
        anisotropy,
        level,
        width,
        height,
      }?: Partial<TextureOptions>,
    )
    bind(): void
    update(textureUnit?: number): void
  }

  export class Transform {
    parent: Transform
    children: Transform[]
    visible: boolean
    matrix: Mat4
    worldMatrix: Mat4
    matrixAutoUpdate: boolean
    worldMatrixNeedsUpdate: boolean
    position: Vec3
    scale: Vec3
    up: Vec3
    quaternion: Quat
    rotation: Euler
    constructor()
    setParent(parent: any, notifyParent?: boolean): void
    addChild(child: Transform, notifyChild?: boolean): void
    removeChild(child: Transform, notifyChild?: boolean): void
    updateMatrixWorld(force?: boolean): void
    updateMatrix(): void
    traverse(callback: (node: Transform) => boolean | void): void
    decompose(): void
    lookAt(target: Vec3, invert?: boolean): void
  }

  export interface AnimationOptions {
    objects: BoneTransform[]
    data: any
  }
  export class Animation {
    objects: BoneTransform[]
    data: any
    elapsed: number
    weight: number
    duration: number
    constructor({ objects, data }: AnimationOptions)
    update(totalWeight: number, isSet: any): void
  }

  export type BoxOptions = {
    width: number
    height: number
    depth: number
    widthSegments: number
    heightSegments: number
    depthSegments: number
    attributes: AttributeMap
  }
  export class Box extends Geometry {
    constructor(
      gl: OGLRenderingContext,
      { width, height, depth, widthSegments, heightSegments, depthSegments, attributes }?: Partial<BoxOptions>,
    )
  }

  export interface CurveOptions {
    points: Vec3[]
    divisions: number
    type: 'catmullrom' | 'cubicbezier'
  }
  export class Curve {
    static CATMULLROM: 'catmullrom'
    static CUBICBEZIER: 'cubicbezier'
    static QUADRATICBEZIER: 'quadraticbezier'
    type: 'catmullrom' | 'cubicbezier' | 'quadraticbezier'
    private points
    private divisions
    constructor({ points, divisions, type }?: Partial<CurveOptions>)
    _getQuadraticBezierPoints(divisions?: number): Vec3[]
    _getCubicBezierPoints(divisions?: number): Vec3[]
    _getCatmullRomPoints(divisions?: number, a?: number, b?: number): Vec3[]
    getPoints(divisions?: number, a?: number, b?: number): Vec3[]
  }

  export type CylinderOptions = {
    radiusTop: number
    radiusBottom: number
    height: number
    radialSegments: number
    heightSegments: number
    openEnded: boolean
    thetaStart: number
    thetaLength: number
    attributes: AttributeMap
  }
  export class Cylinder extends Geometry {
    constructor(
      gl: OGLRenderingContext,
      {
        radiusTop,
        radiusBottom,
        height,
        radialSegments,
        heightSegments,
        openEnded,
        thetaStart,
        thetaLength,
        attributes,
      }?: Partial<CylinderOptions>,
    )
  }

  export interface FlowmapOptions {
    size: number
    falloff: number
    alpha: number
    dissipation: number
    type: number
  }
  export class Flowmap {
    gl: OGLRenderingContext
    uniform: {
      value: any
    }
    mask: {
      read: any
      write: any
      swap: () => void
    }
    aspect: number
    mouse: Vec2
    velocity: Vec2
    mesh: Mesh
    constructor(gl: OGLRenderingContext, { size, falloff, alpha, dissipation, type }?: Partial<FlowmapOptions>)
    update(): void
  }

  export class GLTFAnimation {
    private data
    private elapsed
    private weight
    private loop
    private duration
    private startTime
    private endTime
    constructor(data: any, weight?: number)
    update(totalWeight: number, isSet: any): void
    cubicSplineInterpolate(t: any, prevVal: any, prevTan: any, nextTan: any, nextVal: any): any
  }

  export class GLTFLoader {
    static load(
      gl: OGLRenderingContext,
      src: string,
    ): Promise<{
      json: any
      buffers: any[]
      bufferViews: any
      images: any
      textures: any
      materials: any
      meshes: any
      nodes: any
      animations: any
      scenes: any
      scene: any
    }>
    static setBasisManager(manager: BasisManager): void
    static parse(
      gl: any,
      desc: any,
      dir: any,
    ): Promise<{
      json: any
      buffers: any[]
      bufferViews: any
      images: any
      textures: any
      materials: any
      meshes: any
      nodes: any
      animations: any
      scenes: any
      scene: any
    }>
    static parseDesc(src: any): Promise<any>
    static unpackGLB(glb: any): any
    static resolveURI(uri: any, dir: any): string
    static loadBuffers(desc: any, dir: any): Promise<any[]>
    static parseBufferViews(gl: any, desc: any, buffers: any): any
    static async parseImages(gl: any, desc: any, dir: any, bufferViews: any): Promise<any>
    static parseTextures(gl: any, desc: any, images: any): any
    static createTexture(
      gl: any,
      desc: any,
      images: any,
      opts: { sample: any; source: any; name: any; extensions: any; extras: any },
    )
    static parseMaterials(gl: any, desc: any, textures: any): any
    static parseSkins(gl: any, desc: any, bufferViews: any): any
    static parseMeshes(gl: any, desc: any, bufferViews: any, materials: any, skins: any): any
    static parsePrimitives(
      gl: any,
      primitives: any,
      desc: any,
      bufferViews: any,
      materials: any,
      numInstances: any,
      isLightmap: boolean,
    ): any
    static parseAccessor(
      index: any,
      desc: any,
      bufferViews: any,
    ): {
      data: any
      size: any
      type: any
      normalized: any
      buffer: any
      stride: any
      offset: any
      count: any
      min: any
      max: any
    }
    static parseNodes(gl: any, desc: any, meshes: any, skins: any, images: any): any
    static parseLights(gl: any, desc: any, nodes: any, scenes: any)
    static populateSkins(skins: any, nodes: any): void
    static parseAnimations(gl: any, desc: any, nodes: any, bufferViews: any): any
    static parseScenes(desc: any, nodes: any): any
  }

  export interface GLTFSkinOptions {
    skeleton: any
    geometry: any
    program: any
    mode: any
  }
  export class GLTFSkin extends Mesh {
    skeleton: any
    animations: any
    boneMatrices: Float32Array
    boneTextureSize: number
    boneTexture: Texture
    constructor(gl: any, { skeleton, geometry, program, mode }?: Partial<GLTFSkinOptions>)
    createBoneTexture(): void
    updateUniforms(): void
    draw({ camera }?: { camera?: Camera }): void
  }

  export interface GPGPUpass {
    mesh: Mesh
    program: Program
    uniforms: any
    enabled: any
    textureUniform: any
  }
  export class GPGPU {
    gl: OGLRenderingContext
    passes: GPGPUpass[]
    geometry: Triangle
    dataLength: number
    size: number
    coords: Float32Array
    uniform: {
      value: any
    }
    fbo: {
      read: RenderTarget
      write: RenderTarget
      swap: () => void
    }
    constructor(
      gl: OGLRenderingContext,
      {
        data,
        geometry,
        type,
      }: {
        data?: Float32Array
        geometry?: Triangle
        type?: any
      },
    )
    addPass({
      vertex,
      fragment,
      uniforms,
      textureUniform,
      enabled,
    }?: {
      vertex?: string
      fragment?: string
      uniforms?: {}
      textureUniform?: string
      enabled?: boolean
    }): {
      mesh: Mesh
      program: Program
      uniforms: {}
      enabled: boolean
      textureUniform: string
    }
    render(): void
  }

  export interface KTXTextureOptions {
    buffer: ArrayBuffer
    src: string
    wrapS: number
    wrapT: number
    anisotropy: number
    minFilter: number
    magFilter: number
  }
  export class KTXTexture extends Texture {
    constructor(gl: any, { buffer, wrapS, wrapT, anisotropy, minFilter, magFilter }?: Partial<KTXTextureOptions>)
    parseBuffer(buffer: ArrayBuffer): void
  }

  export function NormalProgram(gl: any): Program

  export type OrbitOptions = {
    element: HTMLElement
    enabled: boolean
    target: Vec3
    ease: number
    inertia: number
    enableRotate: boolean
    rotateSpeed: number
    autoRotate: boolean
    autoRotateSpeed: number
    enableZoom: boolean
    zoomSpeed: number
    enablePan: boolean
    panSpeed: number
    minPolarAngle: number
    maxPolarAngle: number
    minAzimuthAngle: number
    maxAzimuthAngle: number
    minDistance: number
    maxDistance: number
  }
  export class Orbit {
    constructor(
      object: Transform & {
        fov: number
      },
      {
        element,
        enabled,
        target,
        ease,
        inertia,
        enableRotate,
        rotateSpeed,
        autoRotate,
        autoRotateSpeed,
        enableZoom,
        zoomSpeed,
        enablePan,
        panSpeed,
        minPolarAngle,
        maxPolarAngle,
        minAzimuthAngle,
        maxAzimuthAngle,
        minDistance,
        maxDistance,
      }?: Partial<OrbitOptions>,
    )
  }

  export type PlaneOptions = {
    width: number
    height: number
    widthSegments: number
    heightSegments: number
    attributes: AttributeMap
  }
  export class Plane extends Geometry {
    constructor(
      gl: OGLRenderingContext,
      { width, height, widthSegments, heightSegments, attributes }?: Partial<PlaneOptions>,
    )
    static buildPlane(
      position: Float32Array,
      normal: Float32Array,
      uv: Float32Array,
      index: Uint32Array | Uint16Array,
      width: number,
      height: number,
      depth: number,
      wSegs: number,
      hSegs: number,
      u?: number,
      v?: number,
      w?: number,
      uDir?: number,
      vDir?: number,
      i?: number,
      ii?: number,
    ): void
  }

  export interface PolylineOptions {
    points: Vec3[]
    vertex: string
    fragment: string
    uniforms: {
      [key: string]: {
        value: any
      }
    }
    attributes: {
      [key: string]: any
    }
  }
  export class Polyline {
    gl: OGLRenderingContext
    points: Vec3[]
    count: number
    position: Float32Array
    prev: Float32Array
    next: Float32Array
    geometry: Geometry
    resolution: {
      value: Vec2
    }
    dpr: {
      value: number
    }
    thickness: {
      value: number
    }
    color: {
      value: Color
    }
    miter: {
      value: number
    }
    program: Program
    mesh: Mesh
    constructor(gl: OGLRenderingContext, { points, vertex, fragment, uniforms, attributes }: Partial<PolylineOptions>)
    updateGeometry(): void
    resize(): void
  }

  export interface PostOptions {
    width: number
    height: number
    dpr: number
    wrapS: GLenum
    wrapT: GLenum
    minFilter: GLenum
    magFilter: GLenum
    geometry: Triangle
    targetOnly: any
  }
  export interface Pass {
    mesh: Mesh
    program: Program
    uniforms: any
    enabled: boolean
    textureUniform: any
    vertex?: string
    fragment?: string
  }
  export class Post {
    gl: OGLRenderingContext
    options: {
      wrapS: GLenum
      wrapT: GLenum
      minFilter: GLenum
      magFilter: GLenum
      width?: number
      height?: number
    }
    passes: Pass[]
    geometry: Triangle
    uniform: {
      value: any
    }
    targetOnly: boolean
    fbo: { read: RenderTarget; write: RenderTarget; swap: () => void }
    dpr: number
    width: number
    height: number
    constructor(
      gl: OGLRenderingContext,
      { width, height, dpr, wrapS, wrapT, minFilter, magFilter, geometry, targetOnly }?: Partial<PostOptions>,
    )
    addPass({ vertex, fragment, uniforms, textureUniform, enabled }?: Partial<Pass>): {
      mesh: Mesh
      program: Program
      uniforms: any
      enabled: boolean
      textureUniform: string
    }
    resize({
      width,
      height,
      dpr,
    }?: Partial<{
      width: number
      height: number
      dpr: number
    }>): void
    render({
      scene,
      camera,
      texture,
      target,
      update,
      sort,
      frustumCull,
    }: {
      scene?: Transform
      camera?: Camera
      texture?: Texture
      target?: RenderTarget
      update?: boolean
      sort?: boolean
      frustumCull?: boolean
    }): void
  }

  export class Raycast {
    gl: OGLRenderingContext
    origin: Vec3
    direction: Vec3
    constructor(gl: OGLRenderingContext)
    castMouse(camera: Camera, mouse?: number[]): void
    intersectBounds(
      meshes: Mesh | Mesh[],
      {
        maxDistance,
        output,
      }?: {
        maxDistance?: number
        output?: Mesh[]
      },
    ): Mesh[]
    intersectMeshes(
      meshes: Mesh[],
      {
        cullFace,
        maxDistance,
        includeUV,
        includeNormal,
        output,
      }?: {
        cullFace?: boolean
        maxDistance?: number
        includeUV?: boolean
        includeNormal?: boolean
        output?: Mesh[]
      },
    ): Mesh[]
    intersectSphere(sphere: Bounds, origin?: Vec3, direction?: Vec3): number
    intersectBox(box: Bounds, origin?: Vec3, direction?: Vec3): number
    intersectTriangle(
      a: Vec3,
      b: Vec3,
      c: Vec3,
      backfaceCulling?: boolean,
      origin?: Vec3,
      direction?: Vec3,
      normal?: Vec3,
    ): number
    getBarycoord(point: Vec3, a: Vec3, b: Vec3, c: Vec3, target?: Vec3): Vec3
  }

  export class Shadow {
    gl: OGLRenderingContext
    light: Camera
    target: RenderTarget
    depthProgram: Program
    castMeshes: Mesh[]
    constructor(
      gl: OGLRenderingContext,
      {
        light,
        width,
        height,
      }: {
        light?: Camera
        width?: number
        height?: number
      },
    )
    add({
      mesh,
      receive,
      cast,
      vertex,
      fragment,
      uniformProjection,
      uniformView,
      uniformTexture,
    }: {
      mesh: Mesh
      receive?: boolean
      cast?: boolean
      vertex?: string
      fragment?: string
      uniformProjection?: string
      uniformView?: string
      uniformTexture?: string
    }): void
    render({ scene }: { scene: Transform }): void
  }

  export interface SkinRig {
    bindPose: { position: Vec3; quaternion: Quat; scale: Vec3 }
    bones: { name: string; parent: Transform }[]
  }

  export interface SkinOptions {
    rig: SkinRig
    geometry: Geometry
    program: Program
    mode: GLenum
  }
  export interface BoneTransform extends Transform {
    name: string
    bindInverse: Mat4
  }
  export class Skin extends Mesh {
    animations: Animation[]
    boneTexture: Texture
    boneTextureSize: number
    boneMatrices: Float32Array
    root: Transform
    bones: BoneTransform[]
    constructor(gl: OGLRenderingContext, { rig, geometry, program, mode }?: Partial<SkinOptions>)
    createBones(rig: SkinRig): void
    createBoneTexture(): void
    addAnimation(data: any): Animation
    update(): void
    draw({ camera }?: { camera?: Camera }): void
  }

  export type SphereOptions = {
    radius: number
    widthSegments: number
    heightSegments: number
    phiStart: number
    phiLength: number
    thetaStart: number
    thetaLength: number
    attributes: AttributeMap
  }
  export class Sphere extends Geometry {
    constructor(
      gl: OGLRenderingContext,
      {
        radius,
        widthSegments,
        heightSegments,
        phiStart,
        phiLength,
        thetaStart,
        thetaLength,
        attributes,
      }?: Partial<SphereOptions>,
    )
  }

  export class Text {
    constructor({
      font,
      text,
      width,
      align,
      size,
      letterSpacing,
      lineHeight,
      wordSpacing,
      wordBreak,
    }: {
      font: any
      text: any
      width?: number
      align?: 'left' | 'right' | 'center'
      size?: number
      letterSpacing?: number
      lineHeight?: number
      wordSpacing?: number
      wordBreak?: boolean
    })
  }

  export interface TextureLoaderOptions {
    src:
      | Partial<{
          pvrtc: string
          s3tc: string
          etc: string
          etc1: string
          astc: string
          webp: string
          jpg: string
          png: string
        }>
      | string
    wrapS: number
    wrapT: number
    anisotropy: number
    format: number
    internalFormat: number
    generateMipmaps: boolean
    minFilter: number
    magFilter: number
    premultiplyAlpha: boolean
    unpackAlignment: number
    flipY: boolean
  }
  export class TextureLoader {
    static load<T extends Texture>(
      gl: OGLRenderingContext,
      {
        src,
        wrapS,
        wrapT,
        anisotropy,
        format,
        internalFormat,
        generateMipmaps,
        minFilter,
        magFilter,
        premultiplyAlpha,
        unpackAlignment,
        flipY,
      }?: Partial<TextureLoaderOptions>,
    ): T
    static getSupportedExtensions(gl: OGLRenderingContext): any[]
    static loadKTX(src: string, texture: KTXTexture): Promise<void>
    static loadImage(gl: OGLRenderingContext, src: string, texture: Texture, flipY: boolean): Promise<HTMLImageElement>
    static clearCache(): void
  }

  export class Torus extends Geometry {
    constructor(
      gl: OGLRenderingContext,
      {
        radius,
        tube,
        radialSegments,
        tubularSegments,
        arc,
        attributes,
      }?: {
        radius?: number
        tube?: number
        radialSegments?: number
        tubularSegments?: number
        arc?: number
        attributes?: {}
      },
    )
  }

  export class Triangle extends Geometry {
    constructor(
      gl: OGLRenderingContext,
      {
        attributes,
      }?: {
        attributes?: {}
      },
    )
  }

  export class Color extends Array<number> {
    constructor(color: [number, number, number])
    constructor(color: number, g: number, b: number)
    constructor(color: string)
    constructor(color: 'black' | 'white' | 'red' | 'green' | 'blue' | 'fuchsia' | 'cyan' | 'yellow' | 'orange')
    constructor(color: number)
    get r(): number
    get g(): number
    get b(): number
    set r(v: number)
    set g(v: number)
    set b(v: number)
    set(color: [number, number, number])
    set(color: number, g: number, b: number)
    set(color: string)
    set(color: 'black' | 'white' | 'red' | 'green' | 'blue' | 'fuchsia' | 'cyan' | 'yellow' | 'orange')
    set(color: number)
    copy(v: Color): this
  }

  export type EulerOrder = 'XYZ' | 'XZY' | 'YXZ' | 'YZX' | 'ZXY' | 'ZYX'

  export class Euler extends Array<number> {
    onChange: () => void
    order: EulerOrder
    constructor(x?: number | Euler, y?: number, z?: number, order?: EulerOrder)
    get x(): number
    get y(): number
    get z(): number
    set x(v: number)
    set y(v: number)
    set z(v: number)
    set(x: number | Euler, y?: number, z?: number): this
    copy(v: Euler): this
    reorder(order: EulerOrder): this
    fromRotationMatrix(m: Mat4, order?: EulerOrder): this
    fromQuaternion(q: Quat, order?: EulerOrder): this
    toArray(a?: number[], o?: number): number[]
  }

  export class Mat3 extends Array<number> {
    constructor(
      m00?: number | Mat3,
      m01?: number,
      m02?: number,
      m10?: number,
      m11?: number,
      m12?: number,
      m20?: number,
      m21?: number,
      m22?: number,
    )
    set(
      m00: number | Mat3,
      m01?: number,
      m02?: number,
      m10?: number,
      m11?: number,
      m12?: number,
      m20?: number,
      m21?: number,
      m22?: number,
    ): this
    translate(v: Vec2, m?: Mat3): this
    rotate(v: number, m?: Mat3): this
    scale(v: Vec2, m?: Mat3): this
    multiply(ma: Mat3, mb: Mat3): this
    identity(): this
    copy(m: Mat3): this
    fromMatrix4(m: Mat4): this
    fromQuaternion(q: Quat): this
    fromBasis(vec3a: Vec3, vec3b: Vec3, vec3c: Vec3): this
    inverse(m?: Mat4): this
    getNormalMatrix(m: Mat4): this
  }

  export class Mat4 extends Array<number> {
    constructor(
      m00?: number | Mat4,
      m01?: number,
      m02?: number,
      m03?: number,
      m10?: number,
      m11?: number,
      m12?: number,
      m13?: number,
      m20?: number,
      m21?: number,
      m22?: number,
      m23?: number,
      m30?: number,
      m31?: number,
      m32?: number,
      m33?: number,
    )
    get x(): number
    get y(): number
    get z(): number
    get w(): number
    set x(v: number)
    set y(v: number)
    set z(v: number)
    set w(v: number)
    set(
      m00: number | Mat4,
      m01?: number,
      m02?: number,
      m03?: number,
      m10?: number,
      m11?: number,
      m12?: number,
      m13?: number,
      m20?: number,
      m21?: number,
      m22?: number,
      m23?: number,
      m30?: number,
      m31?: number,
      m32?: number,
      m33?: number,
    ): this
    translate(v: Vec3, m?: Mat4): this
    rotate(v: Vec3, axis: Vec3, m?: Mat4): this
    scale(v: Vec3, m?: Mat4): this
    multiply(ma: Mat4, mb: Mat4): this
    identity(): this
    copy(m: Mat4): this
    fromPerspective({
      fov,
      aspect,
      near,
      far,
    }?: Partial<{
      fov: number
      aspect: number
      near: number
      far: number
    }>): this
    fromOrthogonal({
      left,
      right,
      bottom,
      top,
      near,
      far,
    }: Partial<{
      left: number
      right: number
      bottom: number
      top: number
      near: number
      far: number
    }>): this
    fromQuaternion(q: Quat): this
    setPosition(v: Vec3): this
    inverse(m?: Mat4): this
    compose(q: Quat, pos: Vec3, scale: Vec3): this
    getRotation(q: Quat): this
    getTranslation(pos: Vec3): this
    getScaling(scale: Vec3): this
    getMaxScaleOnAxis(): number
    lookAt(eye: Vec3, target: Vec3, up: Vec3): this
    determinant(): number
    fromArray(a: number[], o?: number): this
    toArray(a?: number[], o?: number): number[]
  }

  export class Quat extends Array<number> {
    onChange: () => void
    constructor(x?: number | Quat, y?: number, z?: number, w?: number)
    get x(): number
    get y(): number
    get z(): number
    get w(): number
    set x(v: number)
    set y(v: number)
    set z(v: number)
    set w(v: number)
    identity(): this
    set(x: number | Quat, y?: number, z?: number, w?: number): this
    rotateX(a: number): this
    rotateY(a: number): this
    rotateZ(a: number): this
    inverse(q?: Quat): this
    conjugate(q?: Quat): this
    copy(q: Quat): this
    normalize(q?: Quat): this
    multiply(qA: Quat, qB: Quat): this
    dot(v: Quat): number
    fromMatrix3(matrix3: Mat3): this
    fromEuler(euler: Euler): this
    fromAxisAngle(axis: Vec3, a: number): this
    slerp(q: Quat, t: number): this
    fromArray(a: number[], o?: number): this
    toArray(a?: number[], o?: number): number[]
  }

  export class Vec2 extends Array<number> {
    constructor(x?: number | Vec2, y?: number)
    get x(): number
    get y(): number
    set x(v: number)
    set y(v: number)
    set(x: number | Vec2, y?: number): this
    copy(v: Vec2): this
    add(va: Vec2, vb: Vec2): this
    sub(va: Vec2, vb: Vec2): this
    multiply(v: Vec2): this
    divide(v: Vec2): this
    inverse(v?: Vec2): this
    len(): number
    distance(v: Vec2): number
    squaredLen(): number
    squaredDistance(v?: Vec2): number
    negate(v?: Vec2): this
    cross(va: Vec2, vb: Vec2): number
    scale(v: number): this
    normalize(): this
    dot(v: Vec2): number
    equals(v: Vec2): boolean
    applyMatrix3(mat3: Mat3): this
    applyMatrix4(mat4: Mat4): this
    lerp(v: Vec2, a: number): this
    clone(): Vec2
    fromArray(a: number[], o?: number): this
    toArray(a?: number[], o?: number): number[]
  }

  export class Vec3 extends Array<number> {
    constant: number
    constructor(x?: number | Vec3, y?: number, z?: number)
    get x(): number
    get y(): number
    get z(): number
    set x(v: number)
    set y(v: number)
    set z(v: number)
    set(x: number | Vec3, y?: number, z?: number): this
    copy(v: Vec3): this
    add(va: Vec3, vb?: Vec3): this
    sub(va: Vec3, vb?: Vec3): this
    multiply(v: Vec3): this
    divide(v: Vec3): this
    inverse(v?: Vec3): this
    len(): number
    distance(v?: Vec3): number
    squaredLen(): number
    squaredDistance(v?: Vec3): number
    negate(v?: Vec3): this
    cross(va: Vec3, vb?: Vec3): this
    scale(v: number): this
    normalize(): this
    dot(v: Vec3): number
    equals(v: Vec3): boolean
    applyMatrix3(mat3: Mat3): this
    applyMatrix4(mat4: Mat4): this
    scaleRotateMatrix4(mat4: Mat4): this
    applyQuaternion(q: Quat): this
    angle(v: Vec3): number
    lerp(v: Vec3, t: number): this
    clone(): Vec3
    fromArray(a: number[], o?: number): this
    toArray(a?: number[], o?: number): number[]
    transformDirection(mat4: Mat4): this
  }

  export class Vec4 extends Array<number> {
    constructor(x?: number | Vec4, y?: number, z?: number, w?: number)
    get x(): number
    get y(): number
    get z(): number
    get w(): number
    set x(v: number)
    set y(v: number)
    set z(v: number)
    set w(v: number)
    set(x: number | Vec4, y?: number, z?: number, w?: number): this
    copy(v: Vec4): this
    normalize(): this
    multiply(v: number): this
    dot(v: Vec4): this
    fromArray(a: number[], o?: number): this
    toArray(a?: number[], o?: number): number[]
  }
}
