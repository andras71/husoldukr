import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit } from '@angular/core';

type ReelState = {
  offset: number;
  transitionMs: number;
};

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, AfterViewInit, OnDestroy {
  readonly reelCount = 7;
  readonly stripDigits = Array.from({ length: 200 }, (_, i) => i % 10);

  reels: ReelState[] = Array.from({ length: this.reelCount }, () => ({
    offset: 0,
    transitionMs: 0
  }));

  elapsedFlip = {
    days: { value: '0', flipping: false },
    hours: { value: '00', flipping: false },
    minutes: { value: '00', flipping: false },
    seconds: { value: '00', flipping: false }
  };

  private elapsedIntervalId: number | null = null;

// pontos dátumot ide állítsd
  private readonly oathDate = new Date('2026-05-03T10:00:00+02:00');

  private spinIntervals: number[] = [];
  private stopTimeouts: number[] = [];
  private startTimeoutId: number | null = null;

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly elementRef: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.prepareInitialState();
  }

  ngAfterViewInit(): void {
    this.updateElapsedTime();

    this.elapsedIntervalId = window.setInterval(() => {
      this.updateElapsedTime();
    }, 1000);
    this.startTimeoutId = window.setTimeout(() => {
      this.startOdometer();
    }, 150);
  }

  ngOnDestroy(): void {
    this.spinIntervals.forEach(id => window.clearInterval(id));
    this.stopTimeouts.forEach(id => window.clearTimeout(id));

    if (this.startTimeoutId !== null) {
      window.clearTimeout(this.startTimeoutId);
    }
  }

  trackIndex(index: number): number {
    return index;
  }

  getTransform(offset: number): string {
    const digitHeight = this.getDigitHeight();
    return `translate3d(0, -${offset * digitHeight}px, 0)`;
  }

  private prepareInitialState(): void {
    this.reels = Array.from({ length: this.reelCount }, () => ({
      offset: 20 + this.randomDigit(),
      transitionMs: 0
    }));

    this.cdr.detectChanges();
  }

  private startOdometer(): void {
    this.reels.forEach((reel, index) => {
      let currentOffset = reel.offset;

      const intervalId = window.setInterval(() => {
        const step = 1 + Math.floor(Math.random() * 3);
        currentOffset += step;

        this.reels[index] = {
          offset: currentOffset,
          transitionMs: 80 + index * 10
        };

        this.reels = [...this.reels];
        this.cdr.detectChanges();
      }, 90 + index * 15);

      this.spinIntervals.push(intervalId);

      const stopTimeoutId = window.setTimeout(() => {
        window.clearInterval(intervalId);

        const targetOffset = this.getSafeFinalOffset(index, currentOffset);

        this.reels[index] = {
          offset: targetOffset,
          transitionMs: 1200 + index * 180
        };

        this.reels = [...this.reels];
        this.cdr.detectChanges();
      }, 1800 + index * 450);

      this.stopTimeouts.push(stopTimeoutId);
    });
  }

  private getSafeFinalOffset(index: number, currentOffset: number): number {
    const minimumForwardSteps = 20 + index * 6;
    const baseTarget = currentOffset + minimumForwardSteps;

    return baseTarget + ((10 - (baseTarget % 10)) % 10);
  }

  private getDigitHeight(): number {
    const firstDigit = this.elementRef.nativeElement.querySelector('.digit') as HTMLElement | null;

    if (firstDigit && firstDigit.offsetHeight > 0) {
      return firstDigit.offsetHeight;
    }

    const hostStyles = getComputedStyle(this.elementRef.nativeElement);
    const cssVar = hostStyles.getPropertyValue('--digit-height').trim();

    const parsed = parseInt(cssVar, 10);
    return Number.isFinite(parsed) ? parsed : 64;
  }

  private randomDigit(): number {
    return Math.floor(Math.random() * 10);
  }

  private updateElapsedTime(): void {
    const diffMs = Date.now() - this.oathDate.getTime();
    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));

    const next = {
      days: String(Math.floor(totalSeconds / 86400)),
      hours: this.pad2(Math.floor((totalSeconds % 86400) / 3600)),
      minutes: this.pad2(Math.floor((totalSeconds % 3600) / 60)),
      seconds: this.pad2(totalSeconds % 60)
    };

    this.setFlipValue('days', next.days);
    this.setFlipValue('hours', next.hours);
    this.setFlipValue('minutes', next.minutes);
    this.setFlipValue('seconds', next.seconds);

    this.cdr.detectChanges();
  }

  private setFlipValue(
    key: 'days' | 'hours' | 'minutes' | 'seconds',
    nextValue: string
  ): void {
    const item = this.elapsedFlip[key];

    if (item.value === nextValue) {
      return;
    }

    item.flipping = false;

    window.setTimeout(() => {
      item.value = nextValue;
      item.flipping = true;
      this.cdr.detectChanges();

      window.setTimeout(() => {
        item.flipping = false;
        this.cdr.detectChanges();
      }, 650);
    }, 20);
  }

  private pad2(value: number): string {
    return value.toString().padStart(2, '0');
  }
}
