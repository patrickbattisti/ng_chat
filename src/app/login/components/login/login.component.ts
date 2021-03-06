import {Component, HostBinding, OnInit} from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import {ErrorService} from '../../../core/services/error.service';
import {MatSnackBar} from '@angular/material';
import {Router} from '@angular/router';
import {StorageKeys} from '../../../storage-keys';

@Component({
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

    loginForm: FormGroup;
    configs = {
        isLogin: true,
        actionText: 'Entrar',
        buttonActionText: 'Criar conta',
        isLoading: false
    };
    private nameControl = new FormControl('', [Validators.required]);

    @HostBinding('class.app-login-spinner') private applySpinnerClass = true; //aula 84 => para obter acesso ao componente sem o uso do selector
    constructor(
        private formBuilder: FormBuilder,
        public authService: AuthService,
        private errorService: ErrorService,
        private snackbar: MatSnackBar,
        private router: Router
    ) { }

    ngOnInit() {
        this.createForm();

        const userData = this.authService.getRememberMe();

        if(userData) {
            this.email.setValue(userData.email);
            this.password.setValue(userData.password);
        }
    }

    createForm(): void {
        this.loginForm = this.formBuilder.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required]],
        });
    }

    onSubmit(): void {
        console.log(this.loginForm.value);
        console.log(this.loginForm.valid);

        this.configs.isLoading = true;
        const operation = this.configs.isLogin? this.authService.signInUser(this.loginForm.value) : this.authService.signUpUser(this.loginForm.value);

        operation.subscribe(res => {
            this.authService.setRememberMe(this.loginForm.value);

            const redirect: string = this.authService.redirectUrl || '/dashboard';
            this.authService.redirectUrl = null;

            this.router.navigate([redirect]);

            this.configs.isLoading = false;
        }, error => {
            this.snackbar.open(this.errorService.getErrorMessage(error), "Done", {duration: 2500});
            this.configs.isLoading = false;
        });
    }

    changeAction(): void {
        this.configs.isLogin = !this.configs.isLogin;
        this.configs.actionText = this.configs.isLogin ? 'Entrar' : 'Criar Conta';
        this.configs.buttonActionText = this.configs.isLogin ? 'Criar Conta' : 'Entrar';
        this.configs.isLogin ? this.loginForm.removeControl('name') : this.loginForm.addControl('name', this.nameControl);
    }

    get name(): FormControl {
        return <FormControl>this.loginForm.get('name');
    }

    get email(): FormControl {
        return <FormControl>this.loginForm.get('email');
    }

    get password(): FormControl {
        return <FormControl>this.loginForm.get('password');
    }
}
