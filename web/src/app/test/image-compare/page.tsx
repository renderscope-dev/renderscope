'use client';

import { useState } from 'react';
import { ImageCompareSlider } from '@/components/image-compare';

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

export default function ImageCompareTestPage() {
  const [trackedPosition, setTrackedPosition] = useState(0.5);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-foreground">
          Image Compare Slider — Component Test
        </h1>
        <p className="mt-2 text-muted-foreground">
          Development test page for the ImageCompareSlider component. Not linked from navigation.
        </p>
      </div>

      <div className="space-y-16">
        {/* Test 1: Default Configuration */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            1. Default Configuration
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Two images at default 50% position, horizontal orientation, labels visible.
          </p>
          <ImageCompareSlider left={imageA} right={imageB} />
        </section>

        {/* Test 2: Vertical Orientation */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            2. Vertical Orientation
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Same images with orientation=&quot;vertical&quot;. The divider is horizontal and
            drags up/down.
          </p>
          <ImageCompareSlider
            left={imageA}
            right={imageB}
            orientation="vertical"
          />
        </section>

        {/* Test 3: Custom Initial Position */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            3. Custom Initial Position (25%)
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            initialPosition=0.25 — slider starts revealing more of the right image.
          </p>
          <ImageCompareSlider
            left={imageA}
            right={imageB}
            initialPosition={0.25}
          />
        </section>

        {/* Test 4: With Metadata Overlay */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            4. With Metadata Overlay
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            showMetadata=true — hover over the image to see render settings for each side.
          </p>
          <ImageCompareSlider
            left={imageA}
            right={imageB}
            showMetadata={true}
          />
        </section>

        {/* Test 5: No Labels */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            5. No Labels
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            showLabels=false — clean look without corner labels.
          </p>
          <ImageCompareSlider
            left={imageA}
            right={imageB}
            showLabels={false}
          />
        </section>

        {/* Test 6: Narrow Container */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            6. Narrow Container (max-w-sm)
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Component inside a max-w-sm container to simulate mobile viewport.
          </p>
          <div className="max-w-sm">
            <ImageCompareSlider left={imageA} right={imageB} />
          </div>
        </section>

        {/* Test 7: Interactive Position Display */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            7. Interactive Position Display
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Demonstrates the onPositionChange callback. Drag the slider to see the value update.
          </p>
          <ImageCompareSlider
            left={imageA}
            right={imageB}
            onPositionChange={setTrackedPosition}
          />
          <div className="mt-3 flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Position:</span>
            <code className="rounded bg-muted px-2 py-1 text-sm font-mono text-foreground">
              {trackedPosition.toFixed(3)}
            </code>
            <span className="text-sm text-muted-foreground">
              ({Math.round(trackedPosition * 100)}%)
            </span>
          </div>
        </section>

        {/* Test 8: Multiple Instances */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            8. Multiple Instances Side by Side
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Two independent instances in a grid — dragging one should not affect the other.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ImageCompareSlider
              left={imageA}
              right={imageB}
              initialPosition={0.3}
            />
            <ImageCompareSlider
              left={imageB}
              right={imageA}
              initialPosition={0.7}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
