import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApiResponse, Test } from '../../models';

@Injectable({ providedIn: 'root' })

export class TestService {
    private http = inject(HttpClient);
    private base = environment.apiUrl;

    getAll() {
        return this.http.get<ApiResponse<Test[]>>(`${this.base}/tests`);
    }

    getById(id: string) {
        return this.http.get<ApiResponse<Test>>(`${this.base}/tests/${id}`);
    }

    create(payload: Partial<Test>) {
        return this.http.post<ApiResponse<Test>>(`${this.base}/tests`, payload);
    }

    update(id: string, payload: Partial<Test>) {
        return this.http.put<ApiResponse<Test>>(`${this.base}/tests/${id}`, payload);
    }

    publish(id: string) {
        return this.http.put<ApiResponse<Test>>(`${this.base}/tests/${id}`, { status: 'live' });
    }

    delete(id: string) {
        return this.http.delete(`${this.base}/tests/${id}`);
    }
}
