//the smart contract
const contractSource = `
  payable contract ArticleAmount =
    record article = 
      { publisherAddress : address,
        title            : string,
        name             : string,
        article          : string,
        caption          : string,
        appreciatedAmount: int }
    record state = { 
      articles : map(int, article),
       totalArticles : int }
    
    entrypoint init() = 
      { articles = {},
       totalArticles = 0 }
    
    entrypoint fetchArticle(index : int) : article =
      switch(Map.lookup(index, state.articles))
        None   => abort("No Article was registered with this index number.")
        Some(x)=> x
      
    stateful entrypoint publishArticle(title' : string, name' : string, article' : string, caption' : string) =
      let article = { publisherAddress = Call.caller, title = title', name = name', article = article', caption = caption', appreciatedAmount = 0}
      let index = fetchtotalArticles() + 1
      put(state { articles[index] = article, totalArticles = index})
      
    entrypoint fetchtotalArticles() : int =
      state.totalArticles
      
    payable stateful entrypoint appreciateArticle(index : int) =
      let article = fetchArticle(index)
      Chain.spend(article.publisherAddress, Call.value)
      let updatedappreciatedAmount = article.appreciatedAmount + Call.value
      let updatedArticles = state.articles{ [index].appreciatedAmount = updatedappreciatedAmount }
      put(state{ articles = updatedArticles })
`;
//Address of the smart contract on the testnet of the aeternity blockchain
const contractAddress ='cct_i49S1NB2ysjDMjnCJiiTRG7DY7VRfS9TiVvQbprAhkFBTezVe';
//Create variable for client so it can be used in different functions
var client = null;
//Create a new global array for the articles
var articleDetails = [];
//Create a new variable to store the number of articles globally
var totalArticles = 0;


function renderArticles() {
  //orders the articles from highest to lowest votes
  articleDetails = articleDetails.sort(function(x,y){return y.Amount - x.Amount});

  var article = $('#article').html();
   //Use mustache parse function to speeds up on future uses
  Mustache.parse(article);
  //Create variable with result of render func form article and data
  var rendered = Mustache.render(article, {articleDetails});
  //Use jquery to add the result of the rendering to our html
  $('#articlesBody').html(rendered);
}

// asychronus read from the blockchain
async function callStatic(func, args) {
  const contract = await client.getContractInstance(contractSource, {contractAddress});
  const calledGet = await contract.call(func, args, {callStatic: true}).catch(e => console.error(e));
  const decodedGet = await calledGet.decode().catch(e => console.error(e));
  return decodedGet;
}

//Create a asynchronous write call for our smart contract
async function contractCall(func, args, value) {
  const contract = await client.getContractInstance(contractSource, {contractAddress});
  console.log("Contract:", contract)
  const calledSet = await contract.call(func, args, {amount:value}).catch(e => console.error(e));
  console.log("CalledSet", calledSet)
  return calledSet;
}

//execution of main function
window.addEventListener('load', async () => {
//first displays loader animation
  $("#loader").show();

  //Initialize the Aepp object through aepp-sdk.browser.js, the base app needs to be running.
  client = await Ae.Aepp();

  //Assign the value of total Articles to the global variable
  totalArticles = await callStatic('fetchtotalArticles', []);

  //Loop over every article to get all their relevant information
  for (let i = 1; i <= totalArticles; i++) {

    //Make the call to the blockchain to get all relevant information on the article
    const article = await callStatic('fetchArticle', [i]);

    //Create article object with  info from the call and push into the array with all articles
    articleDetails.push({
      publisherAddress: article.namee,
      title            : article.title,
      name             : article.name,
      article          : article.article,
      caption          : article.caption,
      author           : article.publisherAddress,
      appreciatedAmount:article.appreciatedAmount,
      index: i,
      amounts: article.appreciatedAmount,
    })
  }
  //updated articles shows
  renderArticles();

  //hide loader
  $("#loader").hide();
});

//When the appreciate button is clicked, get input and execute the function 
jQuery("#articlesBody").on("click", ".publishBtn", async function(event){
  $("#loader").show();
  let value = $(this).siblings('input').val();
    index = event.target.id;

  await contractCall('appreciateArticle', [index], value);

  const foundIndex = articleDetails.findIndex(article => article.index == event.target.id);
  articleDetails[foundIndex].Amount += parseInt(value, 10);

  renderArticles();
   $("#loader").hide();
});

$('#submitBtn').click(async function(){
  $("#loader").show();

  //Variables that get values from the input field through their id
  const title = ($('#title').val()),
  	  name = ($('#name').val()),
  	  article = ($('#info').val()),
      caption = ($('#caption').val());

  await contractCall('publishArticle', [title, name, article, caption], 0);

  //Add the new created article to our articleDetails
  articleDetails.push({
    Articletitle: title,
    Author: name,
    Article: article,
    Caption: caption,
    index: articleDetails.length+1,
    Amount: 0,
  })
  renderArticles();
  $("#loader").hide();
});
