import { createStore, combineReducers, applyMiddleware } from 'redux';
import { thunk } from 'redux-thunk';
import { productsReducer, productDetailsReducer, reviewsReducer, adminProductsReducer } from './reducers/productReducers';

// one store for the whole app (the reference project's layout: store.js + reducers/ + actions/)
const reducer = combineReducers({
    products: productsReducer,
    productDetails: productDetailsReducer,
    reviews: reviewsReducer,
    adminProducts: adminProductsReducer,
});

const store = createStore(reducer, applyMiddleware(thunk));

export default store;
