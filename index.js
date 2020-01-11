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
const contractAddress ='ct_FFoNXy4yapxpfqgvuXtW33hrvMtmhv9BUX3rHSP3km5jet1dm';
var client = null;
var articleDetails = [];
var totalArticles = 0;




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

function renderArticles() {
  articleDetails = articleDetails.sort(function(x,y){return y.Amount-x.Amount})
  var article = $('#article').html();
  Mustache.parse(article);
  var rendered = Mustache.render(article, {articleDetails});
  $('#articlesBody').html(rendered);
}


// async function callStatic(func, args) {
//   const contract = await client.getContractInstance(contractSource, {publisherAddress});
//   const calledGet = await contract.call(func, args, {callStatic: true}).catch(e => console.error(e));
//   const decodedGet = await calledGet.decode().catch(e => console.error(e));

//   return decodedGet;
// }

// async function contractCall(func, args, value) {
//   const contract = await client.getContractInstance(contractSource, {publisherAddress});
//   const calledSet = await contract.call(func, args, {amount: value}).catch(e => console.error(e));

//   return calledSet;
// }

window.addEventListener('load', async () => {
  $("#loader").show();

  client = await Ae.Aepp();

  totalArticles = await callStatic('fetchtotalArticles', []);

  for (let i = 1; i <= totalArticles; i++) {

    const article = await callStatic('fetchArticle', [i]);

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

  renderArticles();

  $("#loader").hide();
});

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
  const title = ($('#title').val()),
  	  name = ($('#name').val()),
  	  article = ($('#info').val()),
      caption = ($('#caption').val());

      await contractCall('publishArticle', [title, name, article, caption], 0);

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
