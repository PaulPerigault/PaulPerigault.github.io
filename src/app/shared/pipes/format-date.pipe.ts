import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'formatDate', standalone: true })
export class FormatDatePipe implements PipeTransform {
  transform(value: string, locale = 'fr-FR'): string {
    const [y, m] = value.split('-');
    return new Date(+y, +m - 1).toLocaleDateString(locale, {
      month: 'short',
      year: 'numeric',
    });
  }
}
