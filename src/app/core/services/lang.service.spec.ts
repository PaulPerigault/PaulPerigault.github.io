import { TestBed } from '@angular/core/testing';
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
});
