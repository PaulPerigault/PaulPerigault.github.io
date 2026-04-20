import { TestBed } from '@angular/core/testing';
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
});
