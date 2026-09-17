import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { LangService } from './lang.service';
import { environment } from '../../../environments/environment';

describe('LangService', () => {
  let service: LangService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(LangService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('defaults to the environment default language', () => {
    expect(service.lang()).toBe(environment.defaultLang);
  });

  it('set updates the lang signal', () => {
    service.set('en');
    expect(service.lang()).toBe('en');
  });

  it('persists lang in localStorage', () => {
    service.set('en');
    expect(localStorage.getItem('lang')).toBe('en');
  });

  it('reuses a previously persisted lang on init', () => {
    localStorage.setItem('lang', 'en');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    expect(TestBed.inject(LangService).lang()).toBe('en');
  });

  describe('outside a browser (ssr/prerendering)', () => {
    let serverService: LangService;

    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      serverService = TestBed.inject(LangService);
    });

    it('defaults to the environment default lang', () => {
      expect(serverService.lang()).toBe(environment.defaultLang);
    });

    it('set updates the signal without touching localStorage', () => {
      serverService.set('en');
      expect(serverService.lang()).toBe('en');
      expect(localStorage.getItem('lang')).toBeNull();
    });
  });
});
