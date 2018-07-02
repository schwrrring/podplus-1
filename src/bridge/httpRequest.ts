import axios from 'axios'

export function httpGet (url: string ) {
    axios.get("https://sheets.googleapis.com/v4/spreadsheets/1WYQ0bi8c6OLGx9ZPgUHhGG3x7unIPz1XpODj7OrHPDE/values/'2017'!A4:A9?key=AIzaSyD4suwZkVkso1nikvBmWtj36YlXHhzgoI0")
        .then(response => console.log(response, "sdfsdfsdfsdfsdfsdfdfgfgdfg"))
}
// AIzaSyDiNgRPFUKS9uokUhNevU5sBUYbCElBTok Api key
