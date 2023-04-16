var storeHandler = {
    setData: (key, value) => {
        localStorage.setItem( key, JSON.stringify( value ) );
    },
    getData: (key) => {
        return JSON.parse( localStorage.getItem( key ) );
    }
}