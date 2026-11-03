import {
    PRODUCTS_REQUEST, PRODUCTS_SUCCESS, PRODUCTS_FAIL,
    PRODUCT_DETAILS_REQUEST, PRODUCT_DETAILS_SUCCESS, PRODUCT_DETAILS_FAIL,
    REVIEWS_REQUEST, REVIEWS_SUCCESS, REVIEWS_FAIL,
    ADMIN_PRODUCTS_REQUEST, ADMIN_PRODUCTS_SUCCESS, ADMIN_PRODUCTS_FAIL,
    BULK_DELETE_PRODUCTS_REQUEST, BULK_DELETE_PRODUCTS_SUCCESS, BULK_DELETE_PRODUCTS_FAIL,
    CLEAR_ERRORS
} from '../constants/productConstants';

// public product list (menu, home page); pages are added to the list for infinite scroll
export const productsReducer = (state = { products: [], count: 0, page: 1, pages: 1, loading: false, error: null }, action) => {
    switch (action.type) {
        case PRODUCTS_REQUEST:
            return { ...state, loading: true, error: null };
        case PRODUCTS_SUCCESS: {
            const { products, count, page, pages, append } = action.payload;
            const merged = append
                ? [...state.products, ...products.filter(p => !state.products.some(old => old._id === p._id))]
                : products;
            return { ...state, loading: false, products: merged, count, page, pages };
        }
        case PRODUCTS_FAIL:
            return { ...state, loading: false, error: action.payload };
        case CLEAR_ERRORS:
            return { ...state, error: null };
        default:
            return state;
    }
};

// one product
export const productDetailsReducer = (state = { product: null, loading: false, error: null }, action) => {
    switch (action.type) {
        case PRODUCT_DETAILS_REQUEST:
            return { ...state, loading: true, error: null };
        case PRODUCT_DETAILS_SUCCESS:
            return { ...state, loading: false, product: action.payload };
        case PRODUCT_DETAILS_FAIL:
            return { ...state, loading: false, error: action.payload };
        case CLEAR_ERRORS:
            return { ...state, error: null };
        default:
            return state;
    }
};

// reviews of the product being viewed
export const reviewsReducer = (state = { reviews: [], ratings: 0, numOfReviews: 0, loading: false, error: null }, action) => {
    switch (action.type) {
        case REVIEWS_REQUEST:
            return { ...state, loading: true, error: null };
        case REVIEWS_SUCCESS:
            return { ...state, loading: false, ...action.payload };
        case REVIEWS_FAIL:
            return { ...state, loading: false, error: action.payload };
        default:
            return state;
    }
};

// admin product table
export const adminProductsReducer = (state = { products: [], loading: false, deleting: false, error: null }, action) => {
    switch (action.type) {
        case ADMIN_PRODUCTS_REQUEST:
            return { ...state, loading: true, error: null };
        case ADMIN_PRODUCTS_SUCCESS:
            return { ...state, loading: false, products: action.payload };
        case ADMIN_PRODUCTS_FAIL:
            return { ...state, loading: false, error: action.payload };
        case BULK_DELETE_PRODUCTS_REQUEST:
            return { ...state, deleting: true, error: null };
        case BULK_DELETE_PRODUCTS_SUCCESS:
            return { ...state, deleting: false, products: state.products.filter(p => !action.payload.includes(p._id)) };
        case BULK_DELETE_PRODUCTS_FAIL:
            return { ...state, deleting: false, error: action.payload };
        case CLEAR_ERRORS:
            return { ...state, error: null };
        default:
            return state;
    }
};
