import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('toggle switches from light to dark', () => {
    if (service.theme() !== 'light') service.toggle();
    service.toggle();
    expect(service.theme()).toBe('dark');
  });

  it('toggle switches from dark to light', () => {
    if (service.theme() !== 'dark') service.toggle();
    service.toggle();
    expect(service.theme()).toBe('light');
  });

  it('persists theme in localStorage', () => {
    if (service.theme() !== 'light') service.toggle();
    service.toggle();
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('initializes from a previously stored dark theme instead of the system preference', () => {
    localStorage.setItem('theme', 'dark');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const restored = TestBed.inject(ThemeService);

    expect(restored.theme()).toBe('dark');
  });

  it('initializes from a previously stored light theme', () => {
    localStorage.setItem('theme', 'light');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const restored = TestBed.inject(ThemeService);

    expect(restored.theme()).toBe('light');
  });

  it('falls back to the system dark preference when nothing is stored', () => {
    const matchMediaSpy = vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const restored = TestBed.inject(ThemeService);

    expect(restored.theme()).toBe('dark');
    matchMediaSpy.mockRestore();
  });

  describe('outside a browser (ssr/prerendering)', () => {
    let serverService: ThemeService;

    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      serverService = TestBed.inject(ThemeService);
    });

    it('defaults to light without touching localStorage', () => {
      expect(serverService.theme()).toBe('light');
    });

    it('toggle updates the signal without touching the dom or localStorage', () => {
      serverService.toggle();
      expect(serverService.theme()).toBe('dark');
      expect(localStorage.getItem('theme')).toBeNull();
    });

    it('init does not throw without a document', () => {
      expect(() => serverService.init()).not.toThrow();
    });
  });
});
