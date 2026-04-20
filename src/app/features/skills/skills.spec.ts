import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { Skills } from './skills';
import { SkillCategory } from '../../core/models';

describe('Skills', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Skills],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideTranslateService()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should create', () => {
    const fixture = TestBed.createComponent(Skills);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    http.expectOne('/data/fr/skills.json').flush([]);
  });

  it('loads and displays skill categories', () => {
    const fixture = TestBed.createComponent(Skills);
    const mock: SkillCategory[] = [{ category: 'Cloud', icon: 'cloud', items: ['Docker'] }];
    fixture.detectChanges();
    http.expectOne('/data/fr/skills.json').flush(mock);
    fixture.detectChanges();
    expect(fixture.componentInstance.skills()).toEqual(mock);
  });
});
