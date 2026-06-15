import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, Subject, Topic, SubTopic } from '../../models';

@Injectable({ providedIn: 'root' })

export class SubjectService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;
  private subjects$?: Observable<ApiResponse<Subject[]>>;

  getSubjects() {
    if (!this.subjects$) {
      this.subjects$ = this.http
        .get<ApiResponse<Subject[]>>(`${this.base}/subjects`)
        .pipe(shareReplay(1));
    }
    return this.subjects$;
  }

  getTopicsBySubject(subjectId: string) {
    return this.http.get<ApiResponse<Topic[]>>(`${this.base}/topics/subject/${subjectId}`);
  }

  getSubTopicsByTopicList(topicIds: string[]) {
    return this.http.post<ApiResponse<SubTopic[]>>(
      `${this.base}/sub-topics/multi-topics`,
      { topicIds },
    );
  }
}
