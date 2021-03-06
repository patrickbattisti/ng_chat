// ***** MÓDULO QUE CONFIGURA O APOLLOCLIENT PARA USAR O GRAPHQL NO PROJETO *****

import {Inject, NgModule} from '@angular/core';
import {HttpClientModule, HttpHeaders} from '@angular/common/http';

import { Apollo, ApolloModule } from 'apollo-angular';
import { HttpLink, HttpLinkModule } from 'apollo-angular-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';
import {environment} from '../environments/environment';
import {onError} from 'apollo-link-error';
import {ApolloLink} from 'apollo-link';
import {StorageKeys} from './storage-keys';
import {GRAPHCOOL_CONFIG, GraphcoolConfig} from './core/providers/graphcool-config.provider';


@NgModule({
    imports: [// nessa sequencia
        HttpClientModule,
        ApolloModule,
        HttpLinkModule
    ]

})
export class ApolloConfigModule {
    constructor(
        private apollo: Apollo,
        @Inject(GRAPHCOOL_CONFIG) private grapcoolConfig: GraphcoolConfig, // aula 103
        private httpLink: HttpLink
    ) {

        const uri = this.grapcoolConfig.simpleApi; // url

        const http = this.httpLink.create({ uri });

        const authMiddleware: ApolloLink = new ApolloLink((operation, forward) => {

            operation.setContext({ //98
                headers: new HttpHeaders({
                    'Authorization': `Bearer ${this.getAuthToken()}`
                })
            });

            return forward(operation);
        });

        const linkError = onError(({ graphQLErrors, networkError }) => {
            if (graphQLErrors) {
                graphQLErrors.map(({ message, locations, path }) =>
                    console.log(
                        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
                    ),
                );
            }
            if (networkError) {
                console.log(`[Network error]: ${networkError}`);
            }
        });

        this.apollo.create({
            link: ApolloLink.from([
                linkError, // seguir sequencia necessaria
                authMiddleware.concat(http)
            ]),
            cache: new InMemoryCache(),
            connectToDevTools: !environment.production
        });
    }

    private getAuthToken(): string {
        return window.localStorage.getItem(StorageKeys.AUTH_TOKEN);
    }


}
