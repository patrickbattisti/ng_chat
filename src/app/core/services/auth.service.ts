import { Injectable } from '@angular/core';
import {Observable, of, pipe, ReplaySubject, throwError} from 'rxjs';
import { Apollo } from 'apollo-angular';
import {AUTHENTICATE_USER_MUTATION, LOGGED_IN_USER_QUERY, LoggedInUserQuery, SIGNUP_USER_MUTATION} from './auth.graphql';
import {catchError, map, mergeMap, tap} from 'rxjs/operators';
import {StorageKeys} from '../../storage-keys';
import {Router} from '@angular/router';
import {Base64} from 'js-base64';

@Injectable({
    providedIn: 'root'
})
export class AuthService {

    redirectUrl: string;
    keepSigned: boolean;
    rememberMe: boolean;
    private _isAuthenticated = new ReplaySubject<boolean>(1);

    constructor(
        private apollo: Apollo,
        private router: Router
    ) {

        // this.signInUser({email: 'patrick@flexpro.com.br', password: 'patrick'}).subscribe(data=> {
        //     console.log(data);
        // });
        //
        // this.signUpUser({name: 'Patrick Battisti', email: 'p@b.com', password: 'patrick'}).subscribe(data=> {
        //     console.log(data);
        // });

        this.isAuthenticated.subscribe(res => {
            console.log('_isAuthenticated', res);
        });

        this.init();
    }

    init(): void {
        this.keepSigned = JSON.parse(window.localStorage.getItem(StorageKeys.KEEP_SIGNED));
        this.rememberMe = JSON.parse(window.localStorage.getItem(StorageKeys.REMEMBER_ME));
    }

    get isAuthenticated(): Observable<boolean> {
        return this._isAuthenticated.asObservable();
    }

    signInUser(variables: {email: string, password: string}): Observable<{id: string, token: string}> {
        return this.apollo.mutate({
            mutation: AUTHENTICATE_USER_MUTATION,
            variables
        }).pipe(
            map(res => res.data.authenticateUser),
            tap(res => this.setAuthState({isAuthenticated: res !== null, token: res && res.token})),
            catchError(error => {
                this.setAuthState( { isAuthenticated: false, token: null });
                return throwError(error);
            })
        );
    }

    signUpUser(variables: {name: string, email: string, password: string}): Observable<{id: string, token: string}> {
        return this.apollo.mutate({
            mutation: SIGNUP_USER_MUTATION,
            variables
        }).pipe(
            map(res => res.data.signupUser),
            tap(res => this.setAuthState({isAuthenticated: res !== null, token: res && res.token})),
            catchError(error => {
                this.setAuthState( { isAuthenticated: false, token: null });
                return throwError(error);
            })
        );
    }

    private setAuthState(authData: { isAuthenticated: boolean, token: string }): void {
        if (authData.isAuthenticated) {
            window.localStorage.setItem(StorageKeys.AUTH_TOKEN, authData.token);
        }
        this._isAuthenticated.next(authData.isAuthenticated);
    }

    toggleKeepSigned(): void {
        this.keepSigned = !this.keepSigned;
        window.localStorage.setItem(StorageKeys.KEEP_SIGNED, this.keepSigned.toString());
    }

    toggleRememberMe(): void {
        this.rememberMe = !this.rememberMe;
        window.localStorage.setItem(StorageKeys.REMEMBER_ME, this.rememberMe.toString());

        if (!this.rememberMe) {
            window.localStorage.removeItem(StorageKeys.USER_EMAIL);
            window.localStorage.removeItem(StorageKeys.USER_PASSWORD);
        }
    }

    private validateToken(): Observable<{id: string, isAuthenticated: boolean}> {
        return this.apollo.query<LoggedInUserQuery>({
            query: LOGGED_IN_USER_QUERY
        }).pipe(
            map(res => {
                const user = res.data.loggedInUser;

                return {id: user && user.id, isAuthenticated: user !== null};
            })
        );
    }

    autoLogin(): Observable<void> {
        if (!this.keepSigned) {
            this._isAuthenticated.next(false);
            window.localStorage.removeItem(StorageKeys.AUTH_TOKEN);
            return of();
        }

        return this.validateToken()
            .pipe(
                tap(authData => {
                    const token = window.localStorage.getItem(StorageKeys.AUTH_TOKEN).toString();
                    this.setAuthState({isAuthenticated: true, token: token});
                }),
                mergeMap(res => of()),
                catchError(error => {
                    this.setAuthState({isAuthenticated: false, token: null});
                    return throwError(error);
                })
            );
    }

    logout(): void {
        window.localStorage.removeItem(StorageKeys.AUTH_TOKEN);
        window.localStorage.removeItem(StorageKeys.KEEP_SIGNED);
        this.keepSigned = false;
        this._isAuthenticated.next(false);
        this.router.navigate(['/login']);
        this.apollo.getClient().resetStore();
    }

    setRememberMe(user: {email: string, password: string}): void {
        if (this.rememberMe) {
            window.localStorage.setItem(StorageKeys.USER_EMAIL, Base64.encode(user.email));
            window.localStorage.setItem(StorageKeys.USER_PASSWORD, Base64.encode(user.password));
        }
    }

    getRememberMe(): {email: string, password: string} {
        if (!this.rememberMe) {
            return null;
        }

        return  {
            email:  Base64.decode(window.localStorage.getItem(StorageKeys.USER_EMAIL)),
            password:  Base64.decode(window.localStorage.getItem(StorageKeys.USER_PASSWORD)),
        };
    }
}
