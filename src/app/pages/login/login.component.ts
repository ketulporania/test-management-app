import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LoadingService } from '../../core/services/loading.service';
import { ToastService } from '../../core/services/toast.service';

function passwordValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value || '';
  const errors: ValidationErrors = {};

  if (value.length < 8)        errors['minLength'] = true;
  if (!/[a-zA-Z]/.test(value)) errors['noLetter'] = true;
  if (!/[0-9]/.test(value))    errors['noNumber'] = true;
  if (/\s/.test(value))        errors['hasSpace'] = true;

  return Object.keys(errors).length > 0 ? errors : null;
}

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})

export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private loadingService = inject(LoadingService);
  private toastr = inject(ToastService);

  loading = signal(false);
  showPassword = signal(false);

  showPasswordRules = signal(false);

  form = this.fb.group({
    userId: ['', Validators.required],
    password: ['', [Validators.required, passwordValidator]],
  });

  get passwordControl() {
    return this.form.get('password');
  }

  onPasswordInput() {
    this.showPasswordRules.set(true);
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.get('userId')?.markAsTouched();
      this.form.get('password')?.markAsTouched();
      return;
    }
  
    this.loading.set(true);
  
    const { userId, password } = this.form.value;
    this.authService.login(userId!, password!).subscribe({
      next: () => {
        this.loadingService.show();
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.toastr.error(err.error?.message);
        this.loading.set(false);
      },
    });
  }
}