import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApiResponse, Question } from '../../models';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })

export class QuestionService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  bulkCreate(payload: { questions: Record<string, unknown>[] }): Observable<any> {
    return this.http.post(`${this.base}/questions/bulk`, payload);
  }

  fetchBulk(question_ids: string[]) {
    return this.http.post<ApiResponse<Question[]>>(
      `${this.base}/questions/fetchBulk`,
      { question_ids },
    );
  }
}
