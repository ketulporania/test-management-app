import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

@Injectable({ providedIn: 'root' })

export class ToastService {
    messages = signal<ToastMessage[]>([]);
    private nextId = 0;

    show(message: string, type: ToastMessage['type'] = 'info') {
        const id = this.nextId++;
        this.messages.update((list) => [...list, { id, message, type }]);
        setTimeout(() => this.remove(id), 4000);
    }

    success(message: string) {
        this.show(message, 'success');
    }

    error(message: string) {
        this.show(message, 'error');
    }

    remove(id: number) {
        this.messages.update((list) => list.filter((m) => m.id !== id));
    }
}
