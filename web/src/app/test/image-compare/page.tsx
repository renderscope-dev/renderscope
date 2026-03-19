'use client';

import { useState } from 'react';
import { ImageCompareSlider } from '@/components/image-compare';
import { ImageDiff } from '@/components/image-compare';
import {
  ImageSSIMHeatmap,
  ColorMapPreview,
} from '@/components/image-compare';
import { ImageToggle } from '@/components/image-compare';
import { RegionZoom } from '@/components/image-compare';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { ColorMapName } from '@/lib/color-maps';
import { COLOR_MAP_NAMES } from '@/lib/color-maps';
import type { ComparisonImage } from '@/types/image-compare';

// ---------------------------------------------------------------------------
// Image data for Session 10.1 slider demos (SVGs)
// ---------------------------------------------------------------------------

const imageA = {
  src: '/test-images/sample-render-a.svg',
  label: 'PBRT v4',
  metadata: {
    'Render Time': '47.3s',
    Samples: '1024 SPP',
    Resolution: '1920 × 1080',
    Integrator: 'volpath',
  },
};

const imageB = {
  src: '/test-images/sample-render-b.svg',
  label: 'Mitsuba 3',
  metadata: {
    'Render Time': '31.8s',
    Samples: '256 SPP',
    Resolution: '1920 × 1080',
    Integrator: 'path',
  },
};

// ---------------------------------------------------------------------------
// Image data for Session 10.2 pixel-analysis demos (PNGs)
// ---------------------------------------------------------------------------

const REFERENCE_URL = '/test-images/reference.png';
const TEST_URL = '/test-images/test.png';

// ---------------------------------------------------------------------------
// Image data for Session 10.3 multi-image demos
// ---------------------------------------------------------------------------

const toggleImages: ComparisonImage[] = [
  { src: '/test-images/sample-render-a.svg', label: 'PBRT v4' },
  { src: '/test-images/sample-render-b.svg', label: 'Mitsuba 3' },
  { src: '/test-images/reference.png', label: 'Reference' },
];

const zoomImages: ComparisonImage[] = [
  { src: '/test-images/reference.png', label: 'Reference' },
  { src: '/test-images/test.png', label: 'Test Render' },
];

// ---------------------------------------------------------------------------
// Test Page
// ---------------------------------------------------------------------------

export default function ImageCompareTestPage() {
  const [trackedPosition, setTrackedPosition] = useState(0.5);

  // ImageDiff controls
  const [diffMode, setDiffMode] = useState<'absolute' | 'luminance'>(
    'absolute',
  );
  const [amplification, setAmplification] = useState(5);
  const [showMetrics, setShowMetrics] = useState(true);

  // SSIM Heatmap controls
  const [colorMapName, setColorMapName] = useState<ColorMapName>('viridis');
  const [blockSize, setBlockSize] = useState(8);

  // ImageToggle controls
  const [toggleInterval, setToggleInterval] = useState(1000);
  const [toggleShowLabel, setToggleShowLabel] = useState(true);
  const [toggleActiveIndex, setToggleActiveIndex] = useState(0);

  // RegionZoom controls
  const [zoomActiveLevel, setZoomActiveLevel] = useState(4);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-foreground">
          Image Comparison — Component Tests
        </h1>
        <p className="mt-2 text-muted-foreground">
          Development test page for all five image comparison components. Not
          linked from navigation.
        </p>
      </div>

      <div className="space-y-20">
        {/* ================================================================
            Section 1: Image Compare Slider (from Session 10.1)
            ================================================================ */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-foreground">
              1. Image Compare Slider
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Drag the slider to compare two renders side by side. Supports
              keyboard navigation (arrow keys, Home/End).
            </p>
          </div>

          <div className="space-y-10">
            {/* Default horizontal */}
            <div>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                Default Configuration
              </h3>
              <ImageCompareSlider left={imageA} right={imageB} />
            </div>

            {/* Vertical orientation */}
            <div>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                Vertical Orientation
              </h3>
              <ImageCompareSlider
                left={imageA}
                right={imageB}
                orientation="vertical"
              />
            </div>

            {/* With metadata + position tracking */}
            <div>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                With Metadata &amp; Position Tracking
              </h3>
              <ImageCompareSlider
                left={imageA}
                right={imageB}
                showMetadata
                onPositionChange={setTrackedPosition}
              />
              <div className="mt-2 flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Position:</span>
                <code className="rounded bg-muted px-2 py-1 font-mono text-sm text-foreground">
                  {trackedPosition.toFixed(3)}
                </code>
                <span className="text-sm text-muted-foreground">
                  ({Math.round(trackedPosition * 100)}%)
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            Section 2: Image Difference
            ================================================================ */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-foreground">
              2. Image Difference
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pixel-level difference between two renders, with adjustable
              amplification. Subtle errors that are invisible to the naked eye
              become clearly visible when amplified.
            </p>
          </div>

          {/* Controls */}
          <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/30 p-3">
            {/* Mode toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Mode
              </span>
              <ToggleGroup
                type="single"
                value={diffMode}
                onValueChange={(val) => {
                  if (val === 'absolute' || val === 'luminance') {
                    setDiffMode(val);
                  }
                }}
                variant="outline"
                size="sm"
              >
                <ToggleGroupItem value="absolute">Absolute</ToggleGroupItem>
                <ToggleGroupItem value="luminance">Luminance</ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Amplification slider */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Amplification
              </span>
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={amplification}
                onChange={(e) => setAmplification(Number(e.target.value))}
                className="h-1.5 w-28 cursor-pointer appearance-none rounded-full bg-border accent-primary [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
              />
              <code className="min-w-[2ch] font-mono text-xs text-foreground">
                {amplification}×
              </code>
            </div>

            {/* Metrics toggle */}
            <Button
              variant={showMetrics ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowMetrics((prev) => !prev)}
              className="text-xs"
            >
              {showMetrics ? 'Metrics On' : 'Metrics Off'}
            </Button>
          </div>

          {/* Component */}
          <ImageDiff
            reference={REFERENCE_URL}
            test={TEST_URL}
            mode={diffMode}
            amplification={amplification}
            showMetrics={showMetrics}
          />
        </section>

        {/* ================================================================
            Section 3: SSIM Heatmap
            ================================================================ */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-foreground">
              3. SSIM Heatmap
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Structural similarity map — shows where two images look alike
              (cool colors) or different (warm colors). This measures perceived
              visual similarity, not just raw pixel values.
            </p>
          </div>

          {/* Controls */}
          <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/30 p-3">
            {/* Colormap selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Colormap
              </span>
              <div className="flex gap-1">
                {COLOR_MAP_NAMES.map((name) => (
                  <button
                    key={name}
                    onClick={() => setColorMapName(name)}
                    className={`flex flex-col items-center gap-1 rounded-md border px-2 py-1.5 text-[10px] transition-colors ${
                      colorMapName === name
                        ? 'border-primary bg-accent text-accent-foreground'
                        : 'border-border bg-transparent text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <ColorMapPreview colorMapName={name} width={48} height={8} />
                    <span>{name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Block size selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Block Size
              </span>
              <Select
                value={String(blockSize)}
                onValueChange={(val) => setBlockSize(Number(val))}
              >
                <SelectTrigger className="h-8 w-20 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 px</SelectItem>
                  <SelectItem value="8">8 px</SelectItem>
                  <SelectItem value="16">16 px</SelectItem>
                  <SelectItem value="32">32 px</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-[10px] text-muted-foreground">
                Smaller = finer detail
              </span>
            </div>
          </div>

          {/* Component */}
          <ImageSSIMHeatmap
            reference={REFERENCE_URL}
            test={TEST_URL}
            colorMap={colorMapName}
            blockSize={blockSize}
          />
        </section>

        {/* ================================================================
            Section 4: Image Toggle (Session 10.3)
            ================================================================ */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-foreground">
              4. Image Toggle
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Rapid A/B comparison by flipping between images with a smooth
              crossfade. Click the image or use arrow keys to cycle. Press space
              to toggle auto-play.
            </p>
          </div>

          {/* Controls */}
          <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/30 p-3">
            {/* Interval control */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Interval
              </span>
              <Select
                value={String(toggleInterval)}
                onValueChange={(val) => setToggleInterval(Number(val))}
              >
                <SelectTrigger className="h-8 w-24 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="500">500ms</SelectItem>
                  <SelectItem value="1000">1000ms</SelectItem>
                  <SelectItem value="2000">2000ms</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Label toggle */}
            <Button
              variant={toggleShowLabel ? 'default' : 'outline'}
              size="sm"
              onClick={() => setToggleShowLabel((prev) => !prev)}
              className="text-xs"
            >
              {toggleShowLabel ? 'Labels On' : 'Labels Off'}
            </Button>

            {/* Active index readout */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Active:</span>
              <code className="rounded bg-muted px-2 py-1 font-mono text-xs text-foreground">
                {toggleActiveIndex + 1} / {toggleImages.length}
              </code>
            </div>
          </div>

          {/* Component */}
          <ImageToggle
            images={toggleImages}
            interval={toggleInterval}
            showLabel={toggleShowLabel}
            onImageChange={setToggleActiveIndex}
          />
        </section>

        {/* ================================================================
            Section 5: Region Zoom (Session 10.3)
            ================================================================ */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-foreground">
              5. Region Zoom
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Precision region magnification — drag the selection box on the
              overview image to zoom into specific areas across multiple
              renderers simultaneously. Use arrow keys to nudge, +/- for zoom
              level, Escape to reset.
            </p>
          </div>

          {/* Controls */}
          <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Initial Zoom
              </span>
              <Select
                value={String(zoomActiveLevel)}
                onValueChange={(val) => setZoomActiveLevel(Number(val))}
              >
                <SelectTrigger className="h-8 w-20 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2×</SelectItem>
                  <SelectItem value="4">4×</SelectItem>
                  <SelectItem value="8">8×</SelectItem>
                  <SelectItem value="16">16×</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Component */}
          <RegionZoom
            key={zoomActiveLevel}
            images={zoomImages}
            zoomLevel={zoomActiveLevel}
          />
        </section>
      </div>
    </div>
  );
}
